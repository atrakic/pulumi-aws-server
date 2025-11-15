import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

export interface KeyPairConfig {
    projectName: string;
    createKeyPair: boolean;
    publicKeyMaterial?: string;
    existingKeyPairName?: string;
    tags: { [key: string]: string };
}

export class KeyPairComponent extends pulumi.ComponentResource {
    public readonly keyName: pulumi.Output<string>;
    public readonly keyPair?: aws.ec2.KeyPair;

    constructor(name: string, config: KeyPairConfig, opts?: pulumi.ComponentResourceOptions) {
        super("custom:aws:KeyPairComponent", name, {}, opts);

        if (config.createKeyPair && config.publicKeyMaterial) {
            this.keyPair = new aws.ec2.KeyPair(`${config.projectName}-key`, {
                publicKey: config.publicKeyMaterial,
                tags: config.tags,
            }, { parent: this });

            this.keyName = this.keyPair.keyName;
        } else if (config.existingKeyPairName) {
            this.keyName = pulumi.output(config.existingKeyPairName);
        } else {
            throw new Error("Either provide publicKeyMaterial with createKeyPair=true, or provide existingKeyPairName");
        }

        this.registerOutputs({
            keyName: this.keyName,
        });
    }
}
