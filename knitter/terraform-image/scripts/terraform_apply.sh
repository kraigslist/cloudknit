echo $show_output_start
echo "Executing terraform apply..." 2>&1 | tee /tmp/apply_output.txt
echo $show_output_end
data='{"metadata":{"labels":{"component_status":"provisioning"}}}'

argocd app patch $team_env_config_name --patch $data --type merge >null

aws s3 cp s3://zlifecycle-tfplan-zmart/$team_name/$env_name/$config_name/tfplans/$config_reconcile_id terraform-plan --profile compuzest-shared

echo $show_output_start
((((terraform apply -auto-approve -input=false -parallelism=2 -no-color terraform-plan; echo $? >&3) | appendLogs "/tmp/apply_output.txt" >&4) 3>&1) | (read xs; exit $xs)) 4>&1
result=$?
echo $result
echo -n $result >/tmp/plan_code.txt
echo $show_output_end

aws s3 cp /tmp/apply_output.txt s3://zlifecycle-tfplan-zmart/$team_name/$env_name/$config_name/$config_reconcile_id/apply_output --profile compuzest-shared

if [ $result -eq 0 ]; then
    data='{"metadata":{"labels":{"component_status":"provisioned"}}}'
    argocd app patch $team_env_config_name --patch $data --type merge >null
else
    data='{"metadata":{"labels":{"component_status":"provision_failed"}}}'
    argocd app patch $team_env_config_name --patch $data --type merge >null

    Error "There is issue with provisioning"
fi
