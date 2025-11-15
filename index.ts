import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import { SecurityGroupComponent, KeyPairComponent, EC2InstanceComponent } from "./components";

// Configurable Ubuntu Server on AWS with Pulumi
// Minimal VPC with public subnet and configurable SSH key pair
// All hardcoded values have been moved to Pulumi configuration for better maintainability.

// Load configuration
const config = new pulumi.Config("aws-server");

// Basic configuration values
const projectName = config.get("projectName") || "ubuntu-ssh";
const instanceType = config.get("instanceType") || "t3.micro";
const allowedCidrBlocks = config.get("allowedCidrBlocks") || "0.0.0.0/0";
const sshPort = config.getNumber("sshPort") || 22;
const createKeyPair = config.getBoolean("createKeyPair") || false;
const publicKeyMaterial = config.get("publicKeyMaterial");
const existingKeyPairName = config.get("existingKeyPairName");
const ubuntuVersion = config.get("ubuntuVersion") || "22.04";
const enablePublicIp = config.getBoolean("enablePublicIp") || true;
const cloudInitFile = config.get("cloudInitFile") || "cloud-init.yaml";
const additionalPorts = config.get("additionalPorts");

// Common tags for all resources
const commonTags = {
    Project: projectName,
    ManagedBy: "Pulumi",
};

// Simple VPC with single public subnet
// Docs: https://www.pulumi.com/registry/packages/awsx/api-docs/ec2/vpc/
const vpc = new awsx.ec2.Vpc(`${projectName}-vpc`, {
    numberOfAvailabilityZones: 1,
    natGateways: { strategy: "None" },
    subnetSpecs: [{ name: "public", type: "Public", cidrMask: 24 }],
    tags: commonTags,
});

// SSH Key Pair configuration - flexible approach for different environments
// Option A: Create new key pair (set createKeyPair=true, provide publicKeyMaterial)
// Option B: Use existing AWS key pair (set createKeyPair=false, provide existingKeyPairName)
// For production: Use existing key pairs for better security and key rotation
// Docs: https://www.pulumi.com/registry/packages/aws/api-docs/ec2/keypair/

// Validate key pair configuration
if (createKeyPair && !publicKeyMaterial) {
    throw new Error("publicKeyMaterial is required when createKeyPair is true");
}
if (!createKeyPair && !existingKeyPairName) {
    throw new Error("existingKeyPairName is required when createKeyPair is false");
}

const keyPairComponent = new KeyPairComponent(`${projectName}-keypair`, {
    projectName,
    createKeyPair,
    publicKeyMaterial, // Your SSH public key content (if creating new)
    existingKeyPairName, // Name of existing AWS key pair (if using existing)
    tags: commonTags,
});

// Security Group for SSH access
// Docs: https://www.pulumi.com/registry/packages/aws/api-docs/ec2/securitygroup/
const securityGroupComponent = new SecurityGroupComponent(`${projectName}-security`, {
    vpcId: vpc.vpcId,
    projectName,
    sshPort, // Configurable SSH port (default: 22)
    allowedCidrBlocks, // CIDR blocks allowed to access the server
    additionalPorts, // Additional ports to open (e.g., "80,443")
    tags: commonTags,
});

// EC2 Instance with basic configuration
// Docs: https://www.pulumi.com/registry/packages/aws/api-docs/ec2/instance/
const instanceComponent = new EC2InstanceComponent(`${projectName}-instance`, {
    projectName,
    instanceType, // EC2 instance size
    subnetId: vpc.publicSubnetIds[0], // Deploy in public subnet
    securityGroupIds: [securityGroupComponent.securityGroup.id],
    enablePublicIp: enablePublicIp, // Enable public IP
    keyName: keyPairComponent.keyName, // SSH key for access
    cloudInitFile: cloudInitFile, // Cloud-init configuration
    ubuntuVersion, // Ubuntu LTS version
    tags: commonTags,
});

// Stack outputs
export const instanceId = instanceComponent.instance.id;
export const instancePublicIp = instanceComponent.instance.publicIp;
export const instancePrivateIp = instanceComponent.instance.privateIp;
export const instancePublicDns = instanceComponent.instance.publicDns;
export const securityGroupId = securityGroupComponent.securityGroup.id;
export const vpcId = vpc.vpcId;
export const publicSubnetId = vpc.publicSubnetIds[0];
export const keyPairName = keyPairComponent.keyName;
export const projectNameOutput = projectName;
export const sshPortOutput = sshPort;

// SSH connection command (adjust key path as needed)
export const sshCommand = pulumi.interpolate`ssh -i ~/.ssh/id_rsa -p ${sshPort} ubuntu@${instanceComponent.instance.publicIp}`;

// Deployment summary in JSON format
export const deploymentInfo = pulumi.interpolate`{
  "project": "${projectName}",
  "instanceType": "${instanceType}",
  "ubuntuVersion": "${ubuntuVersion}",
  "sshPort": ${sshPort},
  "publicIp": "${instanceComponent.instance.publicIp}",
  "privateIp": "${instanceComponent.instance.privateIp}",
  "sshCommand": "ssh -i ~/.ssh/id_rsa -p ${sshPort} ubuntu@${instanceComponent.instance.publicIp}",
  "security": "${additionalPorts ? `Additional ports open: ${additionalPorts}` : `Only SSH port (${sshPort}) open`}"
}`;
