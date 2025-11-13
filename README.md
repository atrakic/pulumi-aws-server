# Configurable Pulumi AWS Server
> See [get started](https://www.pulumi.com/docs/ai/get-started/) guide.

This Pulumi project creates a configurable Ubuntu server on AWS with best practices for different environments.

## Features

- **Environment-specific configurations** (dev, prod)
- **Configurable security settings** (SSH ports, CIDR blocks, additional ports)
- **Flexible SSH key management** (create new or use existing key pairs)
- **Multiple Ubuntu versions support** (20.04, 22.04, 24.04)
- **Modular component architecture** for better maintainability
- **Environment-specific cloud-init configurations**

## Quick Start

1. **Choose your environment configuration:**
   ```bash
   # For development
   pulumi stack select dev
   
   # For production (uses default Pulumi.yaml)
   pulumi stack select production
   ```

2. **Configure your SSH key:**
   ```bash
   pulumi config set aws-server:publicKeyMaterial "$(cat ~/.ssh/id_ed25519.pub)"
   ```

3. **Deploy:**
   ```bash
   pulumi up
   ```

## Configuration Options

### Core Infrastructure
- `aws-server:projectName` - Project name for resource naming
- `aws-server:environment` - Environment (dev/prod)
- `aws-server:instanceType` - EC2 instance type (t3.micro, t3.small, etc.)
- `aws-server:availabilityZones` - Number of AZs for the VPC
- `aws-server:enableNatGateway` - Whether to enable NAT gateway

### Security Configuration
- `aws-server:allowedCidrBlocks` - CIDR blocks allowed to access the server
- `aws-server:sshPort` - SSH port (default: 22)
- `aws-server:additionalPorts` - Comma-separated list of additional ports to open

### SSH Key Management
- `aws-server:createKeyPair` - Whether to create a new key pair
- `aws-server:publicKeyMaterial` - Your SSH public key (if creating new)
- `aws-server:existingKeyPairName` - Name of existing AWS key pair (if not creating new)

### Instance Configuration
- `aws-server:ubuntuVersion` - Ubuntu version (20.04, 22.04, 24.04)
- `aws-server:enablePublicIp` - Whether to assign a public IP
- `aws-server:cloudInitFile` - Cloud-init file to use

## Environment Configurations

### Development (`Pulumi.dev.yaml`)
- Single AZ, t3.micro instance
- Open access (0.0.0.0/0) - **Change this for security!**
- Creates new SSH key pair
- Basic cloud-init configuration

### Production (`Pulumi.yaml` - default configuration)
- Single AZ, t3.medium instance (minimal setup)
- Very restricted access to specific IP ranges
- Custom SSH port (2222)
- Public IP enabled for direct access
- Creates new SSH key pair (provide your production public key)
- Hardened cloud-init configuration with security features

## Cloud-Init Configurations

### Development (`cloud-init-dev.yaml`)
- Basic package updates
- Docker installation
- Development tools

### Production (`cloud-init.yaml`)
- Security hardening (UFW firewall, fail2ban)
- SSH hardening (custom port, restricted access)
- Security auditing and monitoring
- Automatic security updates
- No automatic reboots

## Usage Examples

### 1. Development Setup
```bash
pulumi stack select dev
pulumi config set aws-server:publicKeyMaterial "$(cat ~/.ssh/id_rsa.pub)"
pulumi config set aws-server:allowedCidrBlocks "$(curl -s ifconfig.me)/32"  # Your IP only
pulumi up
```

### 2. Production Deployment
```bash
pulumi stack select production
pulumi config set aws-server:publicKeyMaterial "$(cat ~/.ssh/id_rsa_prod.pub)"
pulumi config set aws-server:allowedCidrBlocks "203.0.113.0/24"  # Your office network
pulumi up
```

### 3. Custom Configuration
```bash
# Custom instance type and additional services
pulumi config set aws-server:instanceType "t3.large"
pulumi config set aws-server:additionalPorts "80,443,3000,9090"
pulumi config set aws-server:ubuntuVersion "24.04"
```

## Component Architecture

The project is organized into reusable components:

- **SecurityGroupComponent**: Manages security groups with configurable rules
- **KeyPairComponent**: Handles SSH key pair creation or existing key usage
- **EC2InstanceComponent**: Creates EC2 instances with AMI lookup and cloud-init

## Security Best Practices

1. **Always restrict CIDR blocks** in production:
   ```bash
   pulumi config set aws-server:allowedCidrBlocks "YOUR.IP.ADDRESS/32"
   ```

2. **Use separate SSH keys for each environment**:
   ```bash
   pulumi config set aws-server:publicKeyMaterial "$(cat ~/.ssh/production_key.pub)"
   ```

3. **Use custom SSH ports in production**:
   ```bash
   pulumi config set aws-server:sshPort 2222
   ```

4. **Disable public IPs in production** (use bastion/VPN):
   ```bash
   pulumi config set aws-server:enablePublicIp false
   ```

## Outputs

After deployment, you'll get:
- Instance ID, public/private IPs
- SSH connection command
- Security group ID
- VPC and subnet information
- Deployment summary with all configuration