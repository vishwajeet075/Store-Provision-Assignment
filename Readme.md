# WooCommerce Multi-Tenant SaaS Platform

A Kubernetes-based automated store provisioning platform that allows users to create and manage their own WooCommerce stores with a single click.

---

## Architecture

### System Overview
```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE LAYER                         │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  React Frontend (Vite)                                        │  │
│  │  • Dashboard - Store Management                               │  │
│  │  • Create Store Modal - Provision New Stores                  │  │
│  │  • Real-time Status Updates via Polling                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ REST API (HTTPS)
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│              PLATFORM NAMESPACE (woocommerce-platform)               │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Backend API (Node.js + Express)                             │  │
│  │  • Authentication & Authorization (JWT)                       │  │
│  │  • Store CRUD Operations                                      │  │
│  │  • Job Queue Management                                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │  MySQL Database  │  │ Redis Queue  │  │ Worker Service   │    │
│  │  (Platform Data) │  │   (BullMQ)   │  │  (Replicas: 3)   │    │
│  │                  │  │              │  │                  │    │
│  │  • users         │  │  Job Queue:  │  │  • Helm Deploy   │    │
│  │  • stores        │  │  • pending   │  │  • URL Updates   │    │
│  └──────────────────┘  │  • active    │  │  • Status Mgmt   │    │
│                        └──────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ Kubernetes API + Helm
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│              STORES NAMESPACE (woocommerce-stores)                   │
│                                                                       │
│  ┌────────────────────────────────────────────────────┐             │
│  │  Shared MySQL Service (mysql-service:3306)         │             │
│  │  • Single database instance for all stores          │             │
│  │  • Table prefixes: s{storeId}_                      │             │
│  └────────────────────────────────────────────────────┘             │
│                                                                       │
│  ┌───────────────────────┐  ┌───────────────────────┐              │
│  │  Store Instance 1     │  │  Store Instance 2     │   ...        │
│  │  ═══════════════════  │  │  ═══════════════════  │              │
│  │  • WordPress 6.8      │  │  • WordPress 6.8      │              │
│  │  • WooCommerce 10.5   │  │  • WooCommerce 10.5   │              │
│  │  • Apache + PHP       │  │  • Apache + PHP       │              │
│  │  • NodePort: 30XXX    │  │  • NodePort: 31XXX    │              │
│  │  • PVC: 10Gi          │  │  • PVC: 10Gi          │              │
│  └───────────────────────┘  └───────────────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component          | Technology                    |
|--------------------|-------------------------------|
| **Frontend**       | React 18 + Vite               |
| **Backend API**    | Node.js 18 + Express          |
| **Job Queue**      | BullMQ + Redis                |
| **Database**       | MySQL 8.0                     |
| **Orchestration**  | Kubernetes + Helm 3           |
| **Store Platform** | WordPress 6.8 + WooCommerce   |
| **Web Server**     | Apache 2.4 + PHP 8.3          |

### Key Features

- **One-Click Store Provisioning** - Automated WordPress + WooCommerce deployment
- **Multi-Tenancy** - Isolated stores with dedicated resources
- **Auto-Scaling Worker Pool** - 3 concurrent store provisioning workers
- **Real-Time Status Updates** - Live provisioning status via polling
- **Persistent Storage** - 10Gi PVC per store
- **Shared Database** - Optimized resource usage with table prefixes

---

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

- **Docker Desktop** (with Kubernetes enabled) - [Download](https://www.docker.com/products/docker-desktop)
- **kubectl** (Kubernetes CLI) - [Install Guide](https://kubernetes.io/docs/tasks/tools/)
- **Helm 3** - [Install Guide](https://helm.sh/docs/intro/install/)
- **Node.js 18+** and **npm** - [Download](https://nodejs.org/)
- **Git** - [Download](https://git-scm.com/)

### Verify Installation

Run these commands to verify everything is installed:
```bash
docker --version         
kubectl version --client  
helm version             
node --version           
npm --version            
```

### Enable Kubernetes in Docker Desktop

1. Open Docker Desktop
2. Go to Settings → Kubernetes
3. Check "Enable Kubernetes"
4. Click "Apply & Restart"
5. Wait for Kubernetes to start (green indicator)

---

## Local Setup

### Step 1: Clone the Repository
```bash
git clone https://github.com/vishwajeet075/Store-Provision-Assignment.git
cd Store-Provision-Assignment
```

### Step 2: Create Kubernetes Namespaces
```bash
kubectl apply -f k8s/namespace.yaml
```

**Expected Output:**
```
namespace/woocommerce-platform created
namespace/woocommerce-stores created
```

### Step 3: Create Kubernetes Secrets

Create MySQL secret:
```bash
kubectl create secret generic mysql-secret \
  --namespace woocommerce-platform \
  --from-literal=mysql-root-password=<any_password>
```

Create MySQL secret for stores namespace:
```bash
kubectl create secret generic mysql-secret \
  --namespace woocommerce-stores \
  --from-literal=mysql-root-password=<any_password>
```

**Expected Output:**
```
secret/mysql-secret created
```

### Step 4: Deploy Backend Services

Run the deployment script:
```bash
chmod +x deploy.sh
./deploy.sh
```

This will deploy:
- MySQL (Platform Database)
- Redis (Job Queue)
- Backend API (2 replicas)
- Worker Service (3 replicas)
- Shared MySQL (Stores Database)
- RBAC & ServiceAccounts

**Wait for all pods to be ready** (may take 2-3 minutes):
```bash
kubectl get pods -n woocommerce-platform
```

**Expected Output:**
```
NAME                                         READY   STATUS    RESTARTS   AGE
backend-api-xxxxxxxxxx-xxxxx                 1/1     Running   0          1m
backend-api-xxxxxxxxxx-xxxxx                 1/1     Running   0          1m
mysql-xxxxxxxxxx-xxxxx                       1/1     Running   0          2m
redis-xxxxxxxxxx-xxxxx                       1/1     Running   0          2m
store-provisioning-worker-xxxxxxxxxx-xxxxx   1/1     Running   0          1m
store-provisioning-worker-xxxxxxxxxx-xxxxx   1/1     Running   0          1m
store-provisioning-worker-xxxxxxxxxx-xxxxx   1/1     Running   0          1m
```

### Step 5: Port Forward Backend API

In a **new terminal window**, run:
```bash
kubectl port-forward svc/backend-api 5000:3000 -n woocommerce-platform
```

**Keep this terminal running!** The backend will be accessible at `http://localhost:5000`

**Expected Output:**
```
Forwarding from 127.0.0.1:5000 -> 3000
Forwarding from [::1]:5000 -> 3000
```

### Step 6: Install Frontend Dependencies

In a **new terminal window**:
```bash
cd frontend
npm install
```

### Step 7: Start Frontend Development Server
```bash
npm run dev
```

**Expected Output:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Step 8: Access the Application

Open your browser and navigate to:

**Frontend:** http://localhost:5173

**Default Login Credentials:**
- Email: `admin@example.com`
- Password: `admin123`

---

## Creating Your First Store

1. **Login** to the dashboard
2. Click **"+ Create Store"**
3. Enter store details:
   - **Store Name**: `my-first-store` (alphanumeric and hyphens only)
   - **Admin Email**: Your email address
   - **Admin Password**: Minimum 8 characters
4. Click **"Create Store"**
5. Wait 2-3 minutes for provisioning (watch status change from "provisioning" → "ready")
6. Click **"Visit Store"** to access your WooCommerce store
7. Login with the credentials you provided

**Store URL Format:** `http://localhost:XXXXX/wp-login.php`

---

## Production Setup

### Architecture Changes for Production

1. **Ingress Controller** - Replace NodePort with Ingress + SSL/TLS
2. **External Database** - Use managed MySQL (AWS RDS, Google Cloud SQL)
3. **External Redis** - Use managed Redis (AWS ElastiCache, Redis Cloud)
4. **Container Registry** - Push images to Docker Hub, ECR, or GCR
5. **Persistent Volumes** - Use cloud storage (AWS EBS, GCP Persistent Disks)
6. **Monitoring** - Add Prometheus + Grafana
7. **Logging** - ELK Stack or Cloud Logging
8. **CI/CD** - GitHub Actions or GitLab CI
9. **Secrets Management** - Kubernetes Secrets or Vault
10. **Auto-scaling** - HPA for workers and API
