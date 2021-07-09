echo $show_output_start
echo "Executing terraform destroy..."
echo $show_output_end
data='{"metadata":{"labels":{"component_status":"destroying"}}}'

argocd app patch $team_env_config_name --patch $data --type merge >null
aws s3 cp s3://zlifecycle-tfplan-zmart/$team_name/$env_name/$config_name terraform-plan

echo $show_output_start
terraform apply -auto-approve -input=false -parallelism=2 -no-color terraform-plan || Error "Can not apply terraform destroy"
result=$?
echo -n $result >/tmp/plan_code.txt
echo $show_output_end

if [ $result -eq 0 ]; then
    data='{"metadata":{"labels":{"component_status":"destroyed"}}}'
    argocd app patch $team_env_config_name --patch $data --type merge >null
else
    data='{"metadata":{"labels":{"component_status":"destroy_failed"}}}'
    argocd app patch $team_env_config_name --patch $data --type merge >null

    Error "There is issue with destroying"
fi
