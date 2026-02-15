#!/bin/bash

set -e  
set -u  

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' 

NAMESPACE_PLATFORM="woocommerce-platform"
NAMESPACE_STORES="woocommerce-stores"
K8S_DIR="./K8s"

print_status() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

wait_for_resource() {
    local resource_type=$1
    local resource_name=$2
    local namespace=$3
    local timeout=${4:-120}
    
    print_status "Waiting for $resource_type/$resource_name in namespace $namespace..."
    if kubectl wait --for=condition=ready --timeout=${timeout}s $resource_type/$resource_name -n $namespace 2>/dev/null; then
        print_success "$resource_type/$resource_name is ready"
        return 0
    else
        print_warning "$resource_type/$resource_name may not be ready, continuing..."
        return 1
    fi
}

wait_for_pods() {
    local label=$1
    local namespace=$2
    local timeout=${3:-120}
    
    print_status "Waiting for pods with label $label in namespace $namespace..."
    if kubectl wait --for=condition=ready pod -l $label -n $namespace --timeout=${timeout}s 2>/dev/null; then
        print_success "Pods with label $label are ready"
        return 0
    else
        print_warning "Pods with label $label may not be ready, continuing..."
        return 1
    fi
}

echo "========================================="
echo " WooCommerce SaaS Platform Deployment"
echo "========================================="
print_status "Starting deployment at $(date)"

if ! command -v kubectl &> /dev/null; then
    print_error "kubectl is not installed or not in PATH"
    exit 1
fi

if [ ! -d "$K8S_DIR" ]; then
    print_error "K8s directory not found at $K8S_DIR"
    exit 1
fi

echo ""
print_status "Step 1: Creating Namespaces..."
print_success "Namespaces created"

kubectl wait --for=jsonpath='{.status.phase}'=Active namespace/$NAMESPACE_PLATFORM --timeout=30s || true
kubectl wait --for=jsonpath='{.status.phase}'=Active namespace/$NAMESPACE_STORES --timeout=30s || true

echo ""
print_status "Step 2: Applying RBAC configurations..."
kubectl apply -f ${K8S_DIR}/serviceaccount.yaml
kubectl apply -f ${K8S_DIR}/clusterrole.yaml
kubectl apply -f ${K8S_DIR}/clusterrolebinding.yaml
print_success "RBAC configurations applied"

echo ""
print_status "Step 5: Deploying Redis..."
kubectl apply -f ${K8S_DIR}/redis-deployment.yaml
wait_for_pods "app=redis" $NAMESPACE_PLATFORM 60
print_success "Redis deployed"

echo ""
print_status "Step 6: Deploying MySQL Backend..."
kubectl apply -f ${K8S_DIR}/mysql-backend-deployment.yaml
wait_for_pods "app=mysql" $NAMESPACE_PLATFORM 120
print_success "MySQL Backend deployed"

echo ""
print_status "Step 7: Deploying MySQL Stores..."
kubectl apply -f ${K8S_DIR}/store-mysql-deployment.yaml
wait_for_pods "app=mysql" $NAMESPACE_STORES 120
print_success "MySQL Stores deployed"

echo ""
print_status "Step 8: Deploying Backend API..."
kubectl apply -f ${K8S_DIR}/backend-deployment.yaml
wait_for_pods "app=backend-api" $NAMESPACE_PLATFORM 180
print_success "Backend API deployed"

echo ""
print_status "Step 9: Deploying Workers..."
kubectl apply -f ${K8S_DIR}/queue-worker-deployment.yaml
wait_for_pods "app=store-provisioning-worker" $NAMESPACE_PLATFORM 120
print_success "Workers deployed"

echo ""
print_status "Step 10: Deploying Frontend..."
kubectl apply -f ${K8S_DIR}/Frontend-deployment.yaml
wait_for_pods "app=frontend" $NAMESPACE_PLATFORM 120
print_success "Frontend deployed"

echo ""
echo "========================================="
print_success "Deployment completed at $(date)"
echo "========================================="
echo ""
print_status "Current Pod Status:"
echo "-----------------------------------------"
kubectl get pods -n $NAMESPACE_PLATFORM
echo "-----------------------------------------"
kubectl get pods -n $NAMESPACE_STORES
echo "-----------------------------------------"

print_status "Current Services:"
echo "-----------------------------------------"
kubectl get svc -n $NAMESPACE_PLATFORM
echo "-----------------------------------------"
kubectl get svc -n $NAMESPACE_STORES
echo "-----------------------------------------"

print_status "Deployment Status:"
kubectl get deployments -n $NAMESPACE_PLATFORM
echo ""
kubectl get deployments -n $NAMESPACE_STORES

echo ""
print_success "All done! Your WooCommerce SaaS platform is deploying."
print_status "To check logs, use: kubectl logs -f <pod-name> -n <namespace>"
print_status "To watch pods: kubectl get pods -n $NAMESPACE_PLATFORM -w"


exit 0