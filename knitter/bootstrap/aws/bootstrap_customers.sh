#!/bin/bash
set -eo pipefail

PARENT_DIRECTORY=$2
cd $PARENT_DIRECTORY

kubectl apply -f company-config.yaml

# Create all team environments
cd ../../../compuzest-zlifecycle-config
kubectl apply -R -f teams/account-team
kubectl apply -R -f teams/user-team