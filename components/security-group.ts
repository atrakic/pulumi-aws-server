import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

export interface SecurityGroupConfig {
    vpcId: pulumi.Input<string>;
    projectName: string;
    sshPort: number;
    allowedCidrBlocks: string;
    additionalPorts?: string;
    tags: { [key: string]: string };
}

export class SecurityGroupComponent extends pulumi.ComponentResource {
    public readonly securityGroup: aws.ec2.SecurityGroup;

    constructor(name: string, config: SecurityGroupConfig, opts?: pulumi.ComponentResourceOptions) {
        super("custom:aws:SecurityGroupComponent", name, {}, opts);

        const createIngressRules = () => {
            const rules = [{
                protocol: "tcp",
                fromPort: config.sshPort,
                toPort: config.sshPort,
                cidrBlocks: [config.allowedCidrBlocks],
                description: "SSH",
            }];

            // Add additional ports if configured
            if (config.additionalPorts) {
                const ports = config.additionalPorts.split(",").map(p => parseInt(p.trim()));
                ports.forEach(port => {
                    rules.push({
                        protocol: "tcp",
                        fromPort: port,
                        toPort: port,
                        cidrBlocks: [config.allowedCidrBlocks],
                        description: `Port ${port}`,
                    });
                });
            }

            return rules;
        };

        this.securityGroup = new aws.ec2.SecurityGroup(`${config.projectName}-sg`, {
            vpcId: config.vpcId,
            description: `Security group for ${config.projectName}`,
            ingress: createIngressRules(),
            egress: [{
                protocol: "-1",
                fromPort: 0,
                toPort: 0,
                cidrBlocks: ["0.0.0.0/0"],
                description: "All outbound",
            }],
            tags: config.tags,
        }, { parent: this });

        this.registerOutputs({
            securityGroupId: this.securityGroup.id,
        });
    }
}
