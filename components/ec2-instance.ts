import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as fs from "fs";

export interface EC2InstanceConfig {
    projectName: string;
    instanceType: string;
    subnetId: pulumi.Input<string>;
    securityGroupIds: pulumi.Input<string>[];
    enablePublicIp: boolean;
    keyName?: pulumi.Input<string>;
    cloudInitFile: string;
    ubuntuVersion: string;
    tags: { [key: string]: string };
}

export class EC2InstanceComponent extends pulumi.ComponentResource {
    public readonly instance: aws.ec2.Instance;
    public readonly ami: pulumi.Output<aws.ec2.GetAmiResult>;

    constructor(name: string, config: EC2InstanceConfig, opts?: pulumi.ComponentResourceOptions) {
        super("custom:aws:EC2InstanceComponent", name, {}, opts);

        // Ubuntu version mapping
        const ubuntuVersionMap: { [key: string]: string } = {
            "20.04": "ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*",
            "22.04": "ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*",
            "24.04": "ubuntu/images/hvm-ssd/ubuntu-noble-24.04-amd64-server-*",
        };

        const amiNamePattern = ubuntuVersionMap[config.ubuntuVersion] || ubuntuVersionMap["22.04"];

        // Lookup the latest Ubuntu AMI
        this.ami = aws.ec2.getAmiOutput({
            owners: ["099720109477"], // Canonical
            filters: [
                { name: "name", values: [amiNamePattern] },
                { name: "virtualization-type", values: ["hvm"] },
            ],
            mostRecent: true,
        });

        // Load cloud-init configuration
        const userData = fs.readFileSync(config.cloudInitFile, "utf8");

        // Create EC2 instance
        this.instance = new aws.ec2.Instance(`${config.projectName}-server`, {
            ami: this.ami.id,
            instanceType: config.instanceType,
            subnetId: config.subnetId,
            vpcSecurityGroupIds: config.securityGroupIds,
            associatePublicIpAddress: config.enablePublicIp,
            keyName: config.keyName,
            userData: userData,
            tags: {
                ...config.tags,
                Name: `${config.projectName}-server`,
            },
        }, { parent: this });

        this.registerOutputs({
            instanceId: this.instance.id,
            publicIp: this.instance.publicIp,
            privateIp: this.instance.privateIp,
        });
    }
}