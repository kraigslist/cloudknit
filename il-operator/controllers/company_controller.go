/* Copyright (C) 2020 CompuZest, Inc. - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium, is strictly prohibited
 * Proprietary and confidential
 *
 * NOTICE: All information contained herein is, and remains the property of
 * CompuZest, Inc. The intellectual and technical concepts contained herein are
 * proprietary to CompuZest, Inc. and are protected by trade secret or copyright
 * law. Dissemination of this information or reproduction of this material is
 * strictly forbidden unless prior written permission is obtained from CompuZest, Inc.
 */

package controllers

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/compuzest/zlifecycle-il-operator/controllers/util/file"
	"github.com/compuzest/zlifecycle-il-operator/controllers/util/repo"
	"k8s.io/apimachinery/pkg/api/errors"

	"github.com/go-logr/logr"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"

	stablev1 "github.com/compuzest/zlifecycle-il-operator/api/v1"
	"github.com/compuzest/zlifecycle-il-operator/controllers/argocd"
	"github.com/compuzest/zlifecycle-il-operator/controllers/util/env"
	"github.com/compuzest/zlifecycle-il-operator/controllers/util/github"
	"github.com/compuzest/zlifecycle-il-operator/controllers/util/il"
)

var initOperatorLock sync.Once

// CompanyReconciler reconciles a Company object.
type CompanyReconciler struct {
	client.Client
	Log    logr.Logger
	Scheme *runtime.Scheme
}

// +kubebuilder:rbac:groups=stable.compuzest.com,resources=companies,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=stable.compuzest.com,resources=companies/status,verbs=get;update;patch

func (r *CompanyReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	start := time.Now()

	// init logic
	var initOperatorError error
	initOperatorLock.Do(func() {
		initOperatorError = r.initCompany(ctx)
	})
	if initOperatorError != nil {
		return ctrl.Result{}, initOperatorError
	}

	// get company resource from k8s cache
	company := &stablev1.Company{}
	if err := r.Get(ctx, req.NamespacedName, company); err != nil {
		if errors.IsNotFound(err) {
			r.Log.Info(
				"Company missing from cache, ending reconcile",
				"name", req.Name,
				"namespace", req.Namespace,
			)
			return ctrl.Result{}, nil
		}
		r.Log.Error(
			err,
			"Error occurred while getting Company",
			"name", req.Name,
			"namespace", req.Namespace,
		)

		return ctrl.Result{}, err
	}

	// services init
	argocdAPI := argocd.NewHTTPClient(ctx, r.Log, env.Config.ArgocdServerURL)
	repoAPI := github.NewHTTPRepositoryAPI(ctx)
	//gitAPI, err := git.NewGoGit(ctx)
	//if err != nil {
	//	return ctrl.Result{}, err
	//}

	// environment config variables
	ilRepoURL := env.Config.ILRepoURL

	// reconcile logic
	companyRepo := company.Spec.ConfigRepo.Source
	operatorSSHSecret := env.Config.ZlifecycleMasterRepoSSHSecret
	operatorNamespace := env.Config.ZlifecycleOperatorNamespace
	if err := repo.TryRegisterRepo(ctx, r.Client, r.Log, argocdAPI, companyRepo, operatorNamespace, operatorSSHSecret); err != nil {
		return ctrl.Result{}, err
	}

	if err := generateAndSaveCompanyApp(company); err != nil {
		return ctrl.Result{}, err
	}

	if err := generateAndSaveCompanyConfigWatcher(company); err != nil {
		return ctrl.Result{}, err
	}

	owner := env.Config.ZlifecycleOwner
	ilRepo := env.Config.ILRepoName
	_, err := github.TryCreateRepository(r.Log, repoAPI, owner, ilRepo)
	if err != nil {
		return ctrl.Result{}, err
	}

	if err := repo.TryRegisterRepo(ctx, r.Client, r.Log, argocdAPI, ilRepoURL, operatorNamespace, operatorSSHSecret); err != nil {
		return ctrl.Result{}, err
	}

	dirty, err := github.CommitAndPushFiles(
		env.Config.ILRepoSourceOwner,
		ilRepo,
		[]string{il.Config.CompanyDirectory, il.Config.ConfigWatcherDirectory},
		env.Config.RepoBranch,
		fmt.Sprintf("Reconciling company %s", company.Spec.CompanyName),
		env.Config.GithubSvcAccntName,
		env.Config.GithubSvcAccntEmail,
	)
	if err != nil {
		return ctrl.Result{}, err
	}
	if dirty {
		r.Log.Info(
			"Committed new changes to IL repo",
			"company", company.Spec.CompanyName,
		)
	} else {
		r.Log.Info(
			"No git changes to commit, no-op reconciliation.",
			"company", company.Spec.CompanyName,
		)
	}

	if err := argocd.TryCreateBootstrapApps(ctx, r.Log); err != nil {
		return ctrl.Result{}, err
	}

	// try create a webhook, it will fail if git service account does not have permissions to create it
	_, err = github.CreateRepoWebhook(r.Log, repoAPI, companyRepo, env.Config.ArgocdHookURL, env.Config.GitHubWebhookSecret)
	if err != nil {
		r.Log.Error(err, "error creating Company webhook", "company", company.Spec.CompanyName)
	}

	duration := time.Since(start)
	r.Log.Info(
		"Reconcile finished",
		"duration", duration,
		"company", company.Spec.CompanyName,
	)

	return ctrl.Result{}, nil
}

func (r *CompanyReconciler) initCompany(ctx context.Context) error {
	r.Log.Info("Running company operator init")

	r.Log.Info("Creating webhook for IL repo")
	repoAPI := github.NewHTTPRepositoryAPI(ctx)
	ilRepoURL := env.Config.ILRepoURL
	if _, err := github.CreateRepoWebhook(r.Log, repoAPI, ilRepoURL, env.Config.ArgocdHookURL, env.Config.GitHubWebhookSecret); err != nil {
		r.Log.Error(err, "error creating Company IL webhook", "repo", ilRepoURL)
	}

	r.Log.Info("Registering helm chart repo")
	argocdAPI := argocd.NewHTTPClient(ctx, r.Log, env.Config.ArgocdServerURL)
	helmChartsRepo := env.Config.HelmChartsRepo
	operatorSSHSecret := env.Config.ZlifecycleMasterRepoSSHSecret
	operatorNamespace := env.Config.ZlifecycleOperatorNamespace

	return repo.TryRegisterRepo(ctx, r.Client, r.Log, argocdAPI, helmChartsRepo, operatorNamespace, operatorSSHSecret)
}

func (r *CompanyReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&stablev1.Company{}).
		Complete(r)
}

func generateAndSaveCompanyApp(company *stablev1.Company) error {
	companyApp := argocd.GenerateCompanyApp(company)
	fileUtil := &file.OsFileService{}

	return fileUtil.SaveYamlFile(*companyApp, il.Config.CompanyDirectory, company.Spec.CompanyName+".yaml")
}

func generateAndSaveCompanyConfigWatcher(company *stablev1.Company) error {
	companyConfigWatcherApp := argocd.GenerateCompanyConfigWatcherApp(company.Spec.CompanyName, company.Spec.ConfigRepo.Source)
	fileUtil := &file.OsFileService{}

	return fileUtil.SaveYamlFile(*companyConfigWatcherApp, il.Config.ConfigWatcherDirectory, company.Spec.CompanyName+".yaml")
}
