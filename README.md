# Simple Pulumi AWS Ubuntu Server

> See [get started](https://www.pulumi.com/docs/ai/get-started/) guide.

A minimal Pulumi project that creates a basic Ubuntu server on AWS with configurable SSH key management.

## Features

- Simple Ubuntu EC2 instance in a minimal VPC
- **Multiple Ubuntu versions support** (20.04, 22.04, 24.04
- Configurable SSH key pair creation or use existing keys
- Basic security groups with customizable access
- Cost-optimized with t3.micro instance and single AZ

## Quick Start

1. **Configure SSH key (choose one option):**

   **Option A: Create new key pair**
   ```bash
   pulumi config set aws-server:createKeyPair true
   pulumi config set aws-server:publicKeyMaterial "$(cat ~/.ssh/id_rsa.pub)"
   ```

   **Option B: Use existing AWS key pair**
   ```bash
   pulumi config set aws-server:createKeyPair false
   pulumi config set aws-server:existingKeyPairName "your-existing-key-name"
   ```

2. **Restrict access to your IP (recommended):**
   ```bash
   pulumi config set aws-server:allowedCidrBlocks "$(curl -s ifconfig.me)/32"
   ```

3. **Deploy:**
   ```bash
   pulumi up --yes
   ```

## Configuration

All configuration is done via `Pulumi.yaml` or CLI commands:

### Required Settings
Choose one SSH key option:
- `aws-server:createKeyPair` - true/false (default: false)
- `aws-server:publicKeyMaterial` - Your SSH public key (if creating new)
- `aws-server:existingKeyPairName` - Name of existing AWS key pair (if using existing)

### Optional Settings
- `aws-server:projectName` - Project name (default: "ubuntu-ssh")
- `aws-server:instanceType` - EC2 instance type (default: "t3.micro")
- `aws-server:allowedCidrBlocks` - IP addresses allowed SSH access (default: "0.0.0.0/0" - **Change this!**)
- `aws-server:ubuntuVersion` - Ubuntu version (default: "22.04")
- `aws-server:additionalPorts` - Additional ports to open (e.g. "80,443")

## Security

⚠️ **Important**: The default configuration allows SSH access from anywhere (`0.0.0.0/0`).

For better security, restrict access to your IP:

```bash
# Set to your current IP
pulumi config set aws-server:allowedCidrBlocks "$(curl -s ifconfig.me)/32"

# Or set to your office network
pulumi config set aws-server:allowedCidrBlocks "203.0.113.0/24"
```

## SSH Key Management

This project supports two approaches for SSH keys:

### Create New Key Pair (Default)
Creates a new AWS key pair using your public key:
```bash
pulumi config set aws-server:createKeyPair true
pulumi config set aws-server:publicKeyMaterial "$(cat ~/.ssh/id_rsa.pub)"
```
**Note**: This may incur small AWS charges for key pair storage.

### Use Existing Key Pair (Cost-Free)
Uses an existing AWS key pair in your account:
```bash
pulumi config set aws-server:createKeyPair false
pulumi config set aws-server:existingKeyPairName "my-existing-key"
```
**Recommended**: Use this option to avoid any key pair creation costs.

## Usage Examples

### Basic deployment with new key pair:
```bash
pulumi config set aws-server:createKeyPair true
pulumi config set aws-server:publicKeyMaterial "$(cat ~/.ssh/id_rsa.pub)"
pulumi config set aws-server:allowedCidrBlocks "$(curl -s ifconfig.me)/32"
pulumi up
```

### Deployment with existing key pair (cost-free):
```bash
pulumi config set aws-server:createKeyPair false
pulumi config set aws-server:existingKeyPairName "my-existing-key"
pulumi config set aws-server:allowedCidrBlocks "$(curl -s ifconfig.me)/32"
pulumi up
```

### Web server with additional ports:
```bash
pulumi config set aws-server:additionalPorts "80,443"
pulumi config set aws-server:instanceType "t3.small"
pulumi up
```

## Prerequisites

- AWS CLI configured or environment variables set
- Pulumi CLI installed
- (If using existing key pair) An existing AWS key pair in your region

## Outputs

After deployment, you'll get:
- Instance public/private IP addresses
- SSH connection command
- Security group and VPC information

## Project Structure

```
├── index.ts              (main infrastructure code)
├── Pulumi.yaml           (configuration)
├── cloud-init.yaml       (server initialization script)
├── package.json          (dependencies)
└── components/           (reusable components)
    ├── security-group.ts
    ├── key-pair.ts
    └── ec2-instance.ts
```

## Cost Optimization

This configuration is designed for minimal cost:
- Single t3.micro instance (free tier eligible)
- Single availability zone
- No NAT gateway
- Option to use existing key pairs (no key creation charges)
