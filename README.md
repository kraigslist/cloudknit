# CloudKnit: An Open Source Cloud Environment Manager

[CloudKnit](https://github.com/cloudknit-io/cloudknit) is an open-source "progressive delivery platform" for managing cloud environments. It enables organizations to **Define** entire environments in a declarative way, **Provision** them, **Detect** and **Reconcile** Drift, and **Teardown** environments when no longer needed. It also comes with dashboards to help visualize environments and observe them.

CloudKnit is based on a concept called [Environment as Code](https://www.zlifecycle.com/blog/from-infrastructure-as-code-to-environment-as-code). Some people have started calling it Declarative Pipelines.

> *Note: We are not a big fan of using Pipeline and Declarative together as Pipeline to us means a sequence of steps which is conflicts with what Declarative means.*

Environment as Code (EaC) is an abstraction over Cloud-native tools that provides a declarative way of defining an entire Environment. It has a Control Plane that manages the state of the environment, including resource dependencies, and drift detection and reconciliation.

![Where CloudKnit connects with existing tools](/assets/images/existing-tools.png)
*<center>Diagram 1: Where does CloudKnit fit in with existing tools</center>*

## Why we built CloudKnit

There are tools today that allow us to manage cloud environments but as the environments become more complex and teams look for advanced use cases, existing tools can fall short. This causes some teams to build and maintain in-house solutions. 

We want to make it easy for DevOps and Platform Engineering teams to manage complex environments.  Existing cloud-native tools like Terraform, Pulumi, Helm, ArgoCD, etc. on their own can be great at managing individual components within an environment or automating simple environments.
However an environment like the one below (Diagram 2) with Infrastructure resources and cloud-native applications requires a different solution. Currently you have two main approaches:

### Option 1: Monolith Infrastructure as Code & Application Deployment

Monolith IaC & Application deployments work well when environments are simple, but as things get complex, it becomes a nightmare to maintain. It creates tight coupling and causes issues like slow provisioning.

### Option 2: Use loosely coupled IaC & Application Deployment & hand-roll pipelines to run them

Creating loosely-coupled components like networking, eks, rds, backend-apps, frontend-apps, etc. makes the individual components easier to manage, but the pipelines that run those components become complex.
Pipeline code needs to manage the logic to run the various components in the correct order, handle failures and tear down unused resources.

Pipeline code is imperative, and users have to write logic on “HOW” to get an entire environment. This causes a maintenance nightmare. We have seen teams write hundreds of lines of unmaintainable pipeline code.

![Where does CloudKnit fit in with existing tools](/assets/images/environment.jpeg)
*<center>Diagram 2: Example Environment</center>*

## Other Challenges

There are other challenges that teams face as their environments become more complex.

* Environment Replication is a pain
* Not easy to Visualize/Understand Environments
* Drift Detection for the entire environment is difficult
* Not straightforward to Promote changes across environments

## How does CloudKnit work?

![CloudKnit](/assets/images/cloudknit.jpeg)
*<center>Diagram 3: CloudKnit</center>*

Environment management with CloudKnit is divided into 4 stages:

### 1. Define

This stage allows you to define an entire environment. We currently support easy to use YAML format for the environment definition.

See example below: 

<details>
  <summary>Environment Definition</summary>

```yaml
apiVersion: stable.cloudknit.com/v1
kind: Environment
metadata:
  name: zmart-payment-prod-blue
  namespace: zmart-config
spec:
  teamName: payment
  envName: prod-blue
  components:
    - name: networking
      type: terraform
      autoApprove: true
      module:
        source: git@github.com:terraform-aws-modules/terraform-aws-vpc.git
      variablesFile:
        path: "prod-blue/vars/networking.tfvars"
      outputs:
        - name: vpc_id
    - name: platform-eks
      type: terraform
      dependsOn: [networking]
      module:
        source: git@github.com:terraform-aws-modules/terraform-aws-eks.git
      variables:
        - name: vpc_id
          valueFrom: networking.vpc_id
      variablesFile:
        path: "prod-blue/vars/platform-eks.tfvars"
    - name: website
      type: helm #Native support for helm chart coming soon
      dependsOn: [platform-eks]
      source:
        repo: git@github.com:helm/examples.git
        path: charts/hello-world
      variables:
        - name: environment
          value: prod-blue
```
</details>

### 2. Provision

CloudKnit Control Plane running in Kubernetes uses the Environment definition & runs various Components (Terraform, Helm Charts, etc.) in the right order. It also provides Visibility & Workflow while Provisioning the environment.

### 3. Detect Drift + Reconciliation

Like Kubernetes does drift detection for k8s apps & reconciles them to match the desired state in source control, CloudKnit does drift detection for the entire environment (infra + apps) & reconciles them. 

Note: In case of Infrastructure as Code CloudKnit provides an ability to see the plan & get manual approval before running the IaC to make sure it doesn't destroy any resources you don't want to, especially in Production environments.

### 4. Teardown

You might want to teardown environments when they are not used to save costs. CloudKnit provides a single line change using flag `teardown` in the Environment YAML. Once `teardown` flag is set to true and definition is pushed to Source Control, CloudKnit picks up the change and tears the environment down by destroying individual components in the correct order.

## Conclusion

We hope that by open-sourcing CloseKnit early, we can form a close-knit open-source community around it to make managing complex cloud environments easy.

For a deeper dive into CloudKnit, see the [architecture document](TBD), our [documentation](https://docs.cloudknit.io), and the [GitHub repo](https://github.com/cloudknit-io/cloudknit).

#### Terminologies

*Components: A logical grouping of 1 or more Infrastructure Resources or Applications that get provisioned together. For example, Networking is an Infrastructure Component with various Infrastructure resources like Virtual Private Cloud(VPC), Subnets, Internet Gateways, Route Tables, etc.*

*Environment: A logical grouping of all the Components needed to run business applications. The grouping includes components like networking, eks, database, k8s apps, etc.*
