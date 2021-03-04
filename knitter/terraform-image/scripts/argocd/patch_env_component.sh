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

set -eo pipefail

team_env_config_name=$1

tfconfig="${team_env_config_name}-terraformconfig"

argocd app patch-resource $team_env_config_name --kind TerraformConfig --resource-name $tfconfig --patch '{ "spec": { "isInSync": false } }' --patch-type 'application/merge-patch+json'
