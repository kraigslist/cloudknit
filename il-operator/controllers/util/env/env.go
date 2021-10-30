package env

import (
	"os"
)

type config struct {
	ZlifecycleOwner               string
	ZlifecycleMasterRepoSSHSecret string
	ZlifecycleOperatorNamespace   string
	ZlifecycleOperatorRepo        string
	CompanyName                   string
	ILRepoName                    string
	ILRepoURL                     string
	ILRepoSourceOwner             string

	EnvironmentStateConfigMap string

	GithubSvcAccntName   string
	GithubSvcAccntEmail  string
	EnvironmentFinalizer string
	GitHubAuthToken      string
	GitHubWebhookSecret  string
	GitHubOrg            string
	RepoBranch           string

	HelmChartsRepo string
	K8sAPIURL      string

	ArgocdServerURL string
	ArgocdHookURL   string
	ArgocdUsername  string
	ArgocdPassword  string

	ArgoWorkflowsServerURL string
	ArgoWorkflowsNamespace string

	APIURL string
}

// Config exposes vars used throughout the operator
var Config = config{
	ZlifecycleOwner:               getOr("GITHUB_ZLIFECYCLE_OWNER", "zlifecycle-il"),
	ZlifecycleMasterRepoSSHSecret: getOr("ZLIFECYCLE_MASTER_SSH", "zlifecycle-operator-ssh"),
	ZlifecycleOperatorNamespace:   os.Getenv("ZLIFECYCLE_OPERATOR_NAMESPACE"),
	ZlifecycleOperatorRepo:        "zlifecycle-il-operator",

	CompanyName:       os.Getenv("companyName"),
	ILRepoName:        os.Getenv("ilRepoName"),
	ILRepoURL:         os.Getenv("ilRepo"),
	ILRepoSourceOwner: os.Getenv("ilRepoSourceOwner"),

	EnvironmentStateConfigMap: "environment-state-cm",

	GithubSvcAccntName:   "zLifecycle",
	GithubSvcAccntEmail:  "zLifecycle@compuzest.com",
	EnvironmentFinalizer: "zlifecycle.compuzest.com/github-finalizer",
	GitHubAuthToken:      os.Getenv("GITHUB_AUTH_TOKEN"),
	GitHubWebhookSecret:  os.Getenv("GITHUB_WEBHOOK_SECRET"),
	GitHubOrg:            os.Getenv("GITHUB_ORG"),
	RepoBranch:           "main",

	HelmChartsRepo: os.Getenv("helmChartsRepo"),
	K8sAPIURL:      "https://kubernetes.default.svc",

	ArgocdServerURL: getOr("ARGOCD_URL", "http://argocd-server.argocd.svc.cluster.local"),
	ArgocdHookURL:   os.Getenv("ARGOCD_WEBHOOK_URL"),
	ArgocdUsername:  os.Getenv("ARGOCD_USERNAME"),
	ArgocdPassword:  os.Getenv("ARGOCD_PASSWORD"),

	ArgoWorkflowsServerURL: getOr("ARGOWORKFLOWS_URL", "http://argo-workflow-server.argocd.svc.cluster.local:2746"),
	ArgoWorkflowsNamespace: "argocd",

	APIURL: getOr("API_URL", "http://zlifecycle-api.zlifecycle-ui.svc.cluster.local"),
}

func getOr(key string, defaultValue string) string {
	val, exists := os.LookupEnv(key)
	if exists && val != "" {
		return val
	}
	return defaultValue
}
