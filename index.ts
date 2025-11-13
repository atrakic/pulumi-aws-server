import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import { SecurityGroupComponent, KeyPairComponent, EC2InstanceComponent } from "./components";

// Configurable Ubuntu Server on AWS with Pulumi
// Minimal, public-only VPC with an Internet Gateway using awsx for simplicity.
// This template creates a secure, configurable Ubuntu server with environment-specific settings.
// All hardcoded values have been moved to Pulumi configuration for better maintainability.

// Load configuration
const config = new pulumi.Config("aws-server");

// Configuration values with defaults
// These can be overridden in Pulumi.<stack>.yaml files for different environments
const projectName = config.get("projectName") || "ubuntu-ssh";
const environment = config.get("environment") || "dev";
const instanceType = config.get("instanceType") || "t3.micro";
const availabilityZones = config.getNumber("availabilityZones") || 1;
const enableNatGateway = config.getBoolean("enableNatGateway") || false;
const allowedCidrBlocks = config.get("allowedCidrBlocks") || "0.0.0.0/0";
const sshPort = config.getNumber("sshPort") || 22;
const createKeyPair = config.getBoolean("createKeyPair") || true;
const publicKeyMaterial = config.get("publicKeyMaterial");
const existingKeyPairName = config.get("existingKeyPairName");
const ubuntuVersion = config.get("ubuntuVersion") || "22.04";
const enablePublicIp = config.getBoolean("enablePublicIp") || true;
const cloudInitFile = config.get("cloudInitFile") || "cloud-init.yaml";
const additionalPorts = config.get("additionalPorts");

// Create common tags
const commonTags = {
    Project: projectName,
    Environment: environment,
    ManagedBy: "Pulumi",
};

// VPC with configurable settings
// Creates a VPC with configurable availability zones and optional NAT gateway.
// For production: enableNatGateway=true, availabilityZones=3+ for high availability
// For development: enableNatGateway=false, availabilityZones=1 for cost savings
// Docs: https://www.pulumi.com/registry/packages/awsx/api-docs/ec2/vpc/
const vpc = new awsx.ec2.Vpc(`${projectName}-vpc`, {
    // Create public subnets across configurable number of AZs
    numberOfAvailabilityZones: availabilityZones,
    natGateways: { strategy: enableNatGateway ? "Single" : "None" },
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

// Security Group with configurable access rules
// SSH access: Configure allowedCidrBlocks to restrict access (default: 0.0.0.0/0 - CHANGE FOR PRODUCTION!)
// Additional ports: Comma-separated list for web services, APIs, etc.
// For production: Restrict allowedCidrBlocks to your office/VPN IP range
// Docs: https://www.pulumi.com/registry/packages/aws/api-docs/ec2/securitygroup/
const securityGroupComponent = new SecurityGroupComponent(`${projectName}-security`, {
    vpcId: vpc.vpcId,
    projectName,
    sshPort, // Configurable SSH port (default: 22, production: use non-standard port)
    allowedCidrBlocks, // CIDR blocks allowed to access the server
    additionalPorts, // Additional ports to open (e.g., "80,443,8080")
    tags: commonTags,
});

// EC2 Instance with configurable settings and cloud-init
// Automatically selects the latest Ubuntu AMI for the specified version
// Cloud-init file: configurable (cloud-init.yaml for dev/staging, cloud-init-prod.yaml for production)
// Instance sizing: t3.micro (dev), t3.small (staging), t3.medium+ (production)
// Public IP: enabled for dev/staging, disabled for production (behind load balancer)
// Docs: https://www.pulumi.com/registry/packages/aws/api-docs/ec2/instance/
const instanceComponent = new EC2InstanceComponent(`${projectName}-instance`, {
    projectName,
    instanceType, // EC2 instance size based on environment
    subnetId: vpc.publicSubnetIds[0], // Deploy in first public subnet
    securityGroupIds: [securityGroupComponent.securityGroup.id],
    enablePublicIp, // Whether to assign public IP address
    keyName: keyPairComponent.keyName, // SSH key for access
    cloudInitFile, // Cloud-init configuration file
    ubuntuVersion, // Ubuntu LTS version (20.04, 22.04, 24.04)
    tags: commonTags,
});

// Comprehensive stack outputs for reference and automation
// These outputs can be used by other Pulumi stacks or external tools
export const instanceId = instanceComponent.instance.id;
export const instancePublicIp = instanceComponent.instance.publicIp;
export const instancePrivateIp = instanceComponent.instance.privateIp;
export const instancePublicDns = instanceComponent.instance.publicDns;
export const securityGroupId = securityGroupComponent.securityGroup.id;
export const vpcId = vpc.vpcId;
export const publicSubnetId = vpc.publicSubnetIds[0];
export const keyPairName = keyPairComponent.keyName;
export const environmentName = environment;
export const projectNameOutput = projectName;

// SSH connection command with configurable key path and port
// Adjust the key path (-i ~/.ssh/id_ed25519) to match your actual key location
export const sshCommand = pulumi.interpolate`ssh -i ~/.ssh/id_ed25519 -p ${sshPort} ubuntu@${instanceComponent.instance.publicIp}`;

// Deployment summary with all key information
// This provides a comprehensive overview of the deployed infrastructure
export const deploymentInfo = pulumi.interpolate`
=== Deployment Summary ===
Project: ${projectName}
Environment: ${environment}
Instance Type: ${instanceType}
Ubuntu Version: ${ubuntuVersion}
SSH Port: ${sshPort}
Public IP: ${instanceComponent.instance.publicIp}
Private IP: ${instanceComponent.instance.privateIp}

SSH Command: ssh -i ~/.ssh/id_ed25519 -p ${sshPort} ubuntu@${instanceComponent.instance.publicIp}

Security: ${additionalPorts ? `Additional ports open: ${additionalPorts}` : "Only SSH port open"}
`;