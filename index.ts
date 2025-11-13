import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as fs from "fs";

// Minimal, public-only VPC with an Internet Gateway using awsx for simplicity.
// Docs: https://www.pulumi.com/registry/packages/awsx/api-docs/ec2/vpc/
const vpc = new awsx.ec2.Vpc("ubuntu-vpc", {
    // Create a single public subnet across 1 AZ for simplicity.
    numberOfAvailabilityZones: 1,
    natGateways: { strategy: "None" },
    subnetSpecs: [{ name: "public", type: "Public", cidrMask: 24 }],
    tags: { Project: "ubuntu-ssh" },
});

// Security group allowing SSH from anywhere (0.0.0.0/0). For production, restrict to your IP.
// Docs: https://www.pulumi.com/registry/packages/aws/api-docs/ec2/securitygroup/
const sg = new aws.ec2.SecurityGroup("ubuntu-sg", {
    vpcId: vpc.vpcId,
    description: "Allow SSH",
    ingress: [{
        protocol: "tcp",
        fromPort: 22,
        toPort: 22,
        cidrBlocks: ["0.0.0.0/0"], // Replace with your IP/CIDR for tighter security.
        description: "SSH",
    }],
    egress: [{
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"],
        description: "All outbound",
    }],
    tags: { Project: "ubuntu-ssh" },
});

// Option A: Provide your existing SSH public key material here to create a key pair.
// If you prefer to use an existing AWS key pair, set keyName below and skip this resource.
// Docs: https://www.pulumi.com/registry/packages/aws/api-docs/ec2/keypair/
const publicKeyMaterial = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMyReplaceThisWithYourPublicKeyContent user@host";
const key = new aws.ec2.KeyPair("ubuntu-key", {
    publicKey: publicKeyMaterial,
    tags: { Project: "ubuntu-ssh" },
});

// Lookup the latest Ubuntu 22.04 LTS (Jammy) AMI published by Canonical for the region.
// This uses aws.ec2.getAmi to find the most recent image matching filters.
// Docs: https://www.pulumi.com/registry/packages/aws/api-docs/ec2/getAmi/
const ubuntuAmi = aws.ec2.getAmiOutput({
    owners: ["099720109477"], // Canonical
    filters: [
        { name: "name", values: ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"] },
        { name: "virtualization-type", values: ["hvm"] },
    ],
    mostRecent: true,
});

// Load cloud-init configuration from external file
const userData = fs.readFileSync("cloud-init.yaml", "utf8");

// Create the EC2 instance in the public subnet with a public IP.
// Docs: https://www.pulumi.com/registry/packages/aws/api-docs/ec2/instance/
const server = new aws.ec2.Instance("ubuntu-server", {
    ami: ubuntuAmi.id,
    instanceType: "t3.micro",
    subnetId: vpc.publicSubnetIds[0],
    vpcSecurityGroupIds: [sg.id],
    associatePublicIpAddress: true,
    keyName: key.keyName, // Or set to an existing key pair name.
    userData: userData,
    tags: { Name: "ubuntu-server", Project: "ubuntu-ssh" },
});

// Useful stack outputs.
export const instancePublicIp = server.publicIp;
export const instancePublicDns = server.publicDns;
export const sshCommand = pulumi.interpolate`ssh -i ~/.ssh/id_ed25519 ubuntu@${server.publicIp}`;
export const vpcId = vpc.vpcId;
export const publicSubnetId = vpc.publicSubnetIds[0];
