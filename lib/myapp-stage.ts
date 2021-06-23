import { MyAppStack } from './myapp-stack';
import { Construct, Stage, StageProps} from '@aws-cdk/core';

export class MyAppStage extends Stage {
    constructor( scope: Construct, id: string, props?: StageProps){
        super(scope,id, props);

        const appStack = new MyAppStack(this, "aspnet");
    }
}