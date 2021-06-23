import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import {AutoScalingGroup, Signals } from '@aws-cdk/aws-autoscaling'
import * as iam from "@aws-cdk/aws-iam"
import * as elbv2 from "@aws-cdk/aws-elasticloadbalancingv2"
import { Asset } from "@aws-cdk/aws-s3-assets"
import * as path from "path"

export class MyAppStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "VPC");

    const amazonLinux = ec2.MachineImage.latestAmazonLinux({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      edition: ec2.AmazonLinuxEdition.STANDARD,
      virtualization: ec2.AmazonLinuxVirt.HVM,
      storage: ec2.AmazonLinuxStorage.GENERAL_PURPOSE,
      cpuType: ec2.AmazonLinuxCpuType.X86_64
    })

    var iamRole = new iam.Role(this, "launchConfigRole", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com")
    })

    iamRole.addToPolicy(
      new iam.PolicyStatement({
        resources: ['*'],
        actions: ["s3:Get*", "s3:List*", "kms:Decrypt"]
      })
    )

    var codePath = path.join(
      __dirname,
      "../app/dotnet-core-tutorial/bin/Release/netcoreapp5.0/linux-x64/publish"
    )

    const directoryAsset = new Asset(this, "codeZipDir", {
      path: codePath,
    });

    const scriptsAsset = new Asset(this, "scriptZipDir", {
      path: path.join(
        __dirname,
        "../app/dotnet-core-tutorial/scripts"
      ),
    });

    const asg = new AutoScalingGroup(this, "aws", {
      vpc: vpc,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.SMALL
      ),
      machineImage: amazonLinux,
      vpcSubnets: vpc.selectSubnets({ subnetType: ec2.SubnetType.PUBLIC}),
      maxCapacity: 2,
      minCapacity: 1,
      role: iamRole,
      init: ec2.CloudFormationInit.fromElements(
        ec2.InitSource.fromAsset(
          "/webapps/helloworld",
          codePath
        ),
        ec2.InitFile.fromAsset(
          "/etc/systemd/system/helloworld.service",
          path.join(
            __dirname,
            "../app/dotnet-core-tutorial/scripts/helloworld.service"
          )
        ),
        ec2.InitFile.fromAsset(
          "/var/starthello.sh",
          path.join(
            __dirname,
            "../app/dotnet-core-tutorial/scripts/starthello.sh"
          )
        ),
        ec2.InitFile.fromAsset(
          "/var/StartHelloWorld.sh",
          path.join(
            __dirname,
            "../app/dotnet-core-tutorial/scripts/StartHelloWorld.sh"
          ),{
            mode: '000700'
          }
        ),
        ec2.InitCommand.shellCommand("/var/StartHelloWorld.sh")
      ),
      signals: Signals.waitForAll({
        timeout: cdk.Duration.minutes(10)
      })
    })

    const loadBalancer = new elbv2.ApplicationLoadBalancer(this, "LB", {
      vpc,
      internetFacing: true,
    })

    const listener = loadBalancer.addListener("Listener", {
      port: 80,
      open: true
    })

    listener.addTargets( "ApplicationFleet", {
      port: 80,
      targets: [asg]
    })



  }
}
