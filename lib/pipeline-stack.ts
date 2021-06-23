import { Stack, Construct, StackProps } from "@aws-cdk/core";
import { CdkPipeline, SimpleSynthAction } from "@aws-cdk/pipelines";
import {Repository } from '@aws-cdk/aws-codecommit'

import * as codepipeline from "@aws-cdk/aws-codepipeline";
import * as codepipeline_actions from "@aws-cdk/aws-codepipeline-actions";
import * as codebuild from "@aws-cdk/aws-codebuild"
import { CodeBuildAction } from "@aws-cdk/aws-codepipeline-actions";

export class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const sourceArtifact = new codepipeline.Artifact();
    const cloudAssemblyArtifact = new codepipeline.Artifact();
    const applicationCode = new codepipeline.Artifact();

    const dotnetBuild = new codebuild.PipelineProject(this, "DotNetBuild", {
        buildSpec: codebuild.BuildSpec.fromObject({
          version: "0.2",
          phases: {
            install: {
              commands: [
                "rpm -Uvh https://packages.microsoft.com/config/centos/7/packages-microsoft-prod.rpm",
                "yum install -y dotnet-sdk-5.0",
                "npm install",
              ],
            },
            build: {
              commands: [
                "cd app/dotnet-core-tutorial/",
                "/usr/share/dotnet/dotnet publish -c Release -r linux-x64 -p:PublishReadyToRun=true",
                "cd ../..",
                "npm run build",
                "npx cdk synth -- -o dist",
                "cd app/dotnet-core-tutorial/",
                "mkdir binaries",
                "cp -r bin/Release/netcoreapp5.0/linux-x64/publish/* binaries",
              ],
            },
          },
          artifacts: {
            "secondary-artifacts": {
              Artifact_Build_DotNet_Build_1: {
                "base-directory": "cdk.out",
                files: ["**/*"],
              },
              Artifact_Build_DotNet_Build_2: {
                files: ["binaries/**/*", "scripts/**/*", "appspec.yml"],
                "base-directory": "app/dotnet-core-tutorial/",
                "discard-paths": "no",
              },
            },
          },
        }),
        environment: {
          buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
        },
      });

    const pipeline = new CdkPipeline(this, "Pipeline", {
      pipelineName: "MyAppPipeline",
      cloudAssemblyArtifact,

      sourceAction: new codepipeline_actions.CodeCommitSourceAction({
        actionName: "Source",
        output: sourceArtifact,
        trigger: codepipeline_actions.CodeCommitTrigger.EVENTS,
        repository: Repository.fromRepositoryName(this, "repository", "aspnet"),
        branch: "master"
      }),

      synthAction: new CodeBuildAction({
          actionName: "DotNet_Build",
          project: dotnetBuild,
          input: sourceArtifact,
          outputs: [cloudAssemblyArtifact, applicationCode]
      })
    });

    
  }
}
