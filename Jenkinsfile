pipeline {
  agent any

  options {
    timestamps()
  }

  environment {
    DEPLOY_DIR = "/opt/it-ticket-system"
  }

  stages {
    stage("Checkout") {
      steps {
        checkout scm
      }
    }

    stage("Sync to deploy dir") {
      steps {
        sh '''#!/usr/bin/env bash
          set -e

          mkdir -p "$DEPLOY_DIR"

          # Sync repo -> deploy folder, but never overwrite/delete env secrets
          rsync -av --delete \
            --exclude ".git" \
            --exclude "backend/.env" \
            --exclude "frontend/.env" \
            ./ "$DEPLOY_DIR"/
        '''

      }
    }

    stage("CI: Lint + Test Frontend") {
      steps {
        sh '''
          set -e
          cd "$DEPLOY_DIR/frontend"
          npm ci
          npm run lint
          npm run test:ci
        '''
      }
    }



    stage("CI: Test Backend") {
      steps {
        sh '''
          set -e
          cd "$DEPLOY_DIR/backend"
          npm ci
          npm test
        '''
      }
    }

    stage("Deploy: Kubernetes (iticket-dev)") {
  steps {
    sh '''
      set -e

      echo "Deploying to Kubernetes namespace: iticket-dev"

      # Apply backend+frontend manifests
      kubectl apply -n iticket-dev -f k8s.yml

      # Apply ingress
      kubectl apply -n iticket-dev -f ingress-dev.yml

      # Wait for deployments to be ready (no half-deploy)
      kubectl -n iticket-dev rollout status deployment/backend --timeout=180s
      kubectl -n iticket-dev rollout status deployment/frontend --timeout=180s

      echo "Kubernetes deploy complete"
    '''
  }
}

    stage("Smoke test (K8s Ingress)") {
  steps {
    sh '''
      set -e
      sleep 5

      echo "checking backend health via ingress..."
      curl -fsS http://localhost:30520/health > /dev/null

      echo "checking frontend via ingress..."
      curl -fsS http://localhost:30520/ > /dev/null

      echo "checking tickets endpoint (should be 401 without token)..."
      code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:30520/api/tickets)
      if [ "$code" != "401" ] && [ "$code" != "200" ]; then
        echo "Unexpected status from /api/tickets: $code"
        exit 1
      fi

      echo "smoke test OK"
    '''
  }
}



    stage("Post-Deploy: Health Check") {
      steps {
        sh '''
          set -e
          

          # Backend ticket endpoint returns 401 without token (that's OK)
          code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/tickets)
          if [ "$code" != "401" ] && [ "$code" != "200" ]; then
            echo "Health check failed: /api/tickets returned HTTP $code"
            exit 1
          fi

          echo "Health check passed."
        '''
      }
    }
  }

  post {
    always {
      echo "pipeline completed"
    }
  }
}

