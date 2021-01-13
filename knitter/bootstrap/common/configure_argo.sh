#!/bin/bash
# Copyright (C) 2020 CompuZest, Inc. - All Rights Reserved
#
# Unauthorized copying of this file, via any medium, is strictly prohibited
# Proprietary and confidential
#
# NOTICE: All information contained herein is, and remains the property of
# CompuZest, Inc. The intellectual and technical concepts contained herein are
# proprietary to CompuZest, Inc. and are protected by trade secret or copyright
# law. Dissemination of this information or reproduction of this material is
# strictly forbidden unless prior written permission is obtained from CompuZest, Inc.

cd ../../zlifecycle-provisioner/k8s-addons/argo-workflow

if [[ $(lsof -i :8080 | wc -l) -eq 0 ]]
then
    echo "Port forwarding ArgoCD"
    kubectl port-forward service/argo-cd-argocd-server 8080:80 -n argocd &
fi

sleep 2m
argocd_server_name=$(kubectl get pods -l app.kubernetes.io/name=argocd-server -n argocd --template '{{range .items}}{{.metadata.name}}{{"\n"}}{{end}}')
argocd login --insecure localhost:8080 --grpc-web --username admin --password $argocd_server_name

# this script is run from zlifecycle-provisioner/k8s-addons/argo-workflow, so path is zlifecycle-provisioner/k8s-addons/argo-workflow
zlifecycleSSHKeyPath=zlifecycle

sleep 10s
ilRepo=$(kubectl get ConfigMap company-config -n zlifecycle-il-operator-system -o jsonpath='{.data.ilRepo}')
ilRepoName=$(kubectl get ConfigMap company-config -n zlifecycle-il-operator-system -o jsonpath='{.data.ilRepoName}')
argocd repo add $ilRepo --name $ilRepoName --ssh-private-key-path $zlifecycleSSHKeyPath --insecure-ignore-host-key

sleep 10s
helmChartsRepo=$(kubectl get ConfigMap company-config -n zlifecycle-il-operator-system -o jsonpath='{.data.helmChartsRepo}')
argocd repo add --name helm-charts $helmChartsRepo --ssh-private-key-path $zlifecycleSSHKeyPath --insecure-ignore-host-key

# Create all bootstrap argo workflow template
cd ../../../zLifecycle/argo-templates
kubectl apply -f .
if [[ $(lsof -i :8081 | wc -l) > 0 ]]
then
    kubectl port-forward service/argo-workflow-server 8081:2746 -n argocd &
fi
