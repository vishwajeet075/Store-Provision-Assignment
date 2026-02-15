const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

const execAsync = promisify(exec);

class HelmService {
  constructor() {
    this.namespace = process.env.HELM_NAMESPACE || 'woocommerce-stores';
    this.chartPath = path.join(__dirname, '../../src/helm-charts/woocommerce-store');
    this.baseDomain = process.env.BASE_DOMAIN || 'stores.example.com';
  }

  /**
   * Check if Helm is installed
   */
  async checkHelm() {
    try {
      const { stdout } = await execAsync('helm version --short');
      console.log('Helm version:', stdout.trim());
      return true;
    } catch (error) {
      console.error('Helm is not installed or not in PATH');
      throw new Error('Helm is not available');
    }
  }

  /**
   * Ensure namespace exists
   */
  async ensureNamespace() {
    try {
      await execAsync(`kubectl get namespace ${this.namespace}`);
      console.log(`Namespace ${this.namespace} exists`);
    } catch (error) {
      console.log(`Creating namespace ${this.namespace}...`);
      await execAsync(`kubectl create namespace ${this.namespace}`);
      console.log(`Namespace ${this.namespace} created`);
    }
  }

  /**
   * Generate store-specific database name
   */
  generateDatabaseName(storeName) {
    // Remove special characters and convert to lowercase
    const sanitized = storeName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `store_${sanitized}`;
  }



/**
 * Generate unique table prefix (WordPress compatible)
 */
generateTablePrefix(storeId) {
  // Remove ALL non-alphanumeric characters
  const cleanId = storeId.toString().replace(/[^a-zA-Z0-9]/g, '');
  
  if (!cleanId) {
    throw new Error(`Invalid storeId: ${storeId}`);
  }
  
  // Prefix with 's' to ensure it starts with a letter
  const prefix = `s${cleanId}_`;
  
  // Validate (only letters, numbers, underscore)
  if (!/^[a-zA-Z0-9_]+$/.test(prefix)) {
    throw new Error(`Invalid table prefix: ${prefix}`);
  }
  
  console.log(`Table prefix: ${prefix}`);
  return prefix;
}

async generateValuesFile(storeData) {
  const {
    storeName,
    storeId,
    adminEmail,
    adminPassword
  } = storeData;

  const storeIdString = String(storeId);
  const releaseName = `store-${storeIdString}`;
  
  const sanitizedStoreName = storeName.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  
  const url = `${sanitizedStoreName}.${this.baseDomain}`;
  
  const tablePrefix = this.generateTablePrefix(storeIdString);

  const values = {
    storeName: storeName,
    storeId: storeIdString,  
    
    wordpress: {
      image: {
        repository: 'wordpress',
        tag: '6.8-apache',
        pullPolicy: 'IfNotPresent'
      },
      env: {
        WORDPRESS_DB_HOST: 'mysql-service.woocommerce-stores.svc.cluster.local:3306',
        WORDPRESS_DB_NAME: 'woocommerce',
        WORDPRESS_DB_USER: 'root',
        WORDPRESS_DB_PASSWORD_SECRET: {
    name: 'mysql-secret',
    key: 'mysql-root-password'
  },
        WORDPRESS_TABLE_PREFIX: tablePrefix,
        WORDPRESS_DEBUG: 'false'
      },
      resources: {
        requests: {
          memory: '256Mi',
          cpu: '100m'
        },
        limits: {
          memory: '512Mi',
          cpu: '300m'
        }
      }
    },

    service: {
      type: 'NodePort',
      port: 80,
      targetPort: 80
    },

    ingress: {
      enabled: false,
      className: process.env.INGRESS_CLASS || 'nginx',
      host: url,
      annotations: {
        'cert-manager.io/cluster-issuer': process.env.CERT_ISSUER || 'letsencrypt-prod',
        'nginx.ingress.kubernetes.io/proxy-body-size': '100m',
        'nginx.ingress.kubernetes.io/client-max-body-size': '100m'
      },
      tls: {
        enabled: true,
        secretName: ''
      }
    },

    persistence: {
      enabled: true,
      storageClass: '',
      size: '10Gi',
      accessMode: 'ReadWriteOnce',
      annotations: {}
    },

    woocommerce: {
      adminUser: 'admin',
      adminPassword: adminPassword,
      adminEmail: adminEmail
    },

    autoscaling: {
      enabled: false,
      minReplicas: 1,
      maxReplicas: 3,
      targetCPUUtilizationPercentage: 80,
      targetMemoryUtilizationPercentage: 80
    },

    healthCheck: {
      enabled: true,
      livenessProbe: {
        httpGet: {
          path: '/wp-login.php',
          port: 80
        },
        initialDelaySeconds: 120,
        periodSeconds: 10,
        timeoutSeconds: 5,
        failureThreshold: 6
      },
      readinessProbe: {
        httpGet: {
          path: '/wp-login.php',
          port: 80
        },
        initialDelaySeconds: 30,
        periodSeconds: 10,
        timeoutSeconds: 5,
        failureThreshold: 3
      }
    },

    securityContext: {
      runAsUser: 33,
      runAsGroup: 33,
      fsGroup: 33
    },

    nodeSelector: {},
    tolerations: [],
    affinity: {},

    serviceAccount: {
      create: true,
      name: ''
    }
  };

  const valuesPath = path.join('/tmp', `values-${releaseName}.yaml`);
  const yamlContent = this.convertToYaml(values);
  await fs.writeFile(valuesPath, yamlContent, 'utf8');
  
  console.log(`Values file: ${valuesPath}`);
  console.log(`Table prefix: ${tablePrefix}`);
  console.log(`Store ID (string): ${storeIdString}`);
  
  return { valuesPath, releaseName, url };
}

convertToYaml(obj, indent = 0) {
  let yaml = '';
  const spaces = '  '.repeat(indent);

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      yaml += `${spaces}${key}: null\n`;
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      yaml += `${spaces}${key}:\n${this.convertToYaml(value, indent + 1)}`;
    } else if (Array.isArray(value)) {
      yaml += `${spaces}${key}:\n`;
      value.forEach(item => {
        if (typeof item === 'object') {
          yaml += `${spaces}- \n${this.convertToYaml(item, indent + 2)}`;
        } else {
          yaml += `${spaces}- ${item}\n`;
        }
      });
    } else if (typeof value === 'string') {
      if (key === 'storeId' || key === 'adminPassword') {
        yaml += `${spaces}${key}: "${value}"\n`;
      }
      else if (!isNaN(value) && value.trim() !== '') {
        yaml += `${spaces}${key}: ${value}\n`;
      } else {
        yaml += `${spaces}${key}: "${value}"\n`;
      }
    } else if (typeof value === 'boolean') {
      yaml += `${spaces}${key}: ${value}\n`;
    } else {
      yaml += `${spaces}${key}: ${value}\n`;
    }
  }

  return yaml;
}

async installRelease(storeData) {
  try {
    await this.checkHelm();
    await this.ensureNamespace();

    const { valuesPath, releaseName, url } = await this.generateValuesFile(storeData);

    console.log(`Installing Helm release: ${releaseName}`);
    
    const command = `helm upgrade --install ${releaseName} ${this.chartPath} \
      --namespace ${this.namespace} \
      --values ${valuesPath} \
      --timeout 5m`;

    const { stdout, stderr } = await execAsync(command);
    
    console.log(`Helm release installed: ${releaseName}`);

    // Cleanup values file
    await fs.unlink(valuesPath);

    // Wait for service to be created
    console.log('Waiting for service to be created...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Get NodePort
    let finalUrl = `https://${url}`; // Default
    
    try {
      const svcCommand = `kubectl get svc -n ${this.namespace} ${releaseName} -o jsonpath='{.spec.ports[0].nodePort}'`;
      const { stdout: nodePort } = await execAsync(svcCommand);
      
      if (nodePort && nodePort.trim()) {
        const nodeIP = process.env.NODE_IP || 'localhost';
        finalUrl = `http://${nodeIP}:${nodePort.trim()}`;
        console.log(`🌐 NodePort URL: ${finalUrl}`);
      }
    } catch (e) {
      console.warn('Could not get NodePort:', e.message);
    }

    return {
      success: true,
      releaseName: releaseName,
      namespace: this.namespace,
      url: finalUrl,
      storeId: storeData.storeId,
      storeName: storeData.storeName,
      status: 'deploying'
    };
  } catch (error) {
    console.error('Error installing Helm release:', error);
    throw error;
  }
}

  /**
   * Upgrade existing Helm release
   */
  async upgradeRelease(storeId, storeData) {
    try {
      const releaseName = `store-${storeId}`;
      const { valuesPath } = await this.generateValuesFile(storeData);

      console.log(`Upgrading Helm release: ${releaseName}`);
      
      const command = `helm upgrade ${releaseName} ${this.chartPath} \
        --namespace ${this.namespace} \
        --values ${valuesPath} \
        --wait \
        --timeout 10m`;

      const { stdout, stderr } = await execAsync(command);
      
      console.log(`Helm release upgraded: ${releaseName}`);
      console.log(stdout);

      // Cleanup values file
      await fs.unlink(valuesPath);

      return { success: true, releaseName };
    } catch (error) {
      console.error('Error upgrading Helm release:', error);
      throw error;
    }
  }

  /**
   * Uninstall Helm release
   */
  async uninstallRelease(releaseName) {
    try {
      console.log(`Uninstalling Helm release: ${releaseName}`);
      
      const command = `helm uninstall ${releaseName} --namespace ${this.namespace}`;
      const { stdout } = await execAsync(command);
      
      console.log(`Helm release uninstalled: ${releaseName}`);
      console.log(stdout);

      return { success: true };
    } catch (error) {
      console.error('Error uninstalling Helm release:', error);
      throw error;
    }
  }

  /**
   * Get release status
   */
  async getReleaseStatus(releaseName) {
    try {
      const command = `helm status ${releaseName} --namespace ${this.namespace} -o json`;
      const { stdout } = await execAsync(command);
      return JSON.parse(stdout);
    } catch (error) {
      console.error('Error getting release status:', error);
      return null;
    }
  }

  /**
   * List all releases
   */
  async listReleases() {
    try {
      const command = `helm list --namespace ${this.namespace} -o json`;
      const { stdout } = await execAsync(command);
      return JSON.parse(stdout);
    } catch (error) {
      console.error('Error listing releases:', error);
      return [];
    }
  }

  /**
   * Get pod logs for a store
   */
  async getStoreLogs(storeId) {
    try {
      const releaseName = `store-${storeId}`;
      const command = `kubectl logs -n ${this.namespace} -l store-name=${releaseName} --tail=100`;
      const { stdout } = await execAsync(command);
      return stdout;
    } catch (error) {
      console.error('Error getting store logs:', error);
      return null;
    }
  }

  /**
   * Check if store is ready
   */
  async isStoreReady(storeId) {
    try {
      const releaseName = `store-${storeId}`;
      const command = `kubectl get pods -n ${this.namespace} -l app.kubernetes.io/instance=${releaseName} -o json`;
      const { stdout } = await execAsync(command);
      const pods = JSON.parse(stdout);
      
      if (pods.items.length === 0) {
        return false;
      }

      // Check if all pods are running and ready
      return pods.items.every(pod => {
        const status = pod.status.phase === 'Running';
        const ready = pod.status.conditions?.some(
          condition => condition.type === 'Ready' && condition.status === 'True'
        );
        return status && ready;
      });
    } catch (error) {
      console.error('Error checking store readiness:', error);
      return false;
    }
  }
}

module.exports = new HelmService();