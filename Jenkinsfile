pipeline {
  agent any                     // Run this pipeline on any available Jenkins agent/node

  options {
    timestamps()                // Add timestamps in Jenkins console logs (helps debugging)
  }

  environment {
    DEPLOY_DIR = "/opt/it-ticket-system" // Where Jenkins copies repo files on the EC2 server
    NAMESPACE  = "iticket-dev"           // Your final namespace (dev == release)
    INGRESS_PORT = "30520"               // NodePort for ingress-nginx-controller (HTTP)
    DOCKERHUB_USER = "bibekpokhrel977"   // Your DockerHub username (used for image names)
    TAG = "${BUILD_NUMBER}"              // Jenkins build number as the image tag (unique per run)
  }

  stages {

    stage("Checkout") {
      steps {
        checkout scm            // Jenkins pulls the repo + branch (*/dev) configured in the job
      }
    }

    stage("Sync to deploy dir") {
      steps {
        sh '''#!/usr/bin/env bash      # Use bash for this script (not sh)
          set -e                       # Exit immediately if any command fails

          mkdir -p "$DEPLOY_DIR"       # Create deploy folder if it doesn't exist

          # Copy code from Jenkins workspace to deploy folder.
          # --delete keeps deploy folder exactly same as repo (removes old files)
          # --exclude prevents overwriting secrets (backend/.env etc.)
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
        sh '''#!/usr/bin/env bash
          set -e                     # Fail stage if any command fails
          cd "$DEPLOY_DIR/frontend"  # Go into frontend project folder

          npm ci                     # Install dependencies exactly from package-lock.json
          npm run lint               # Run ESLint rules (style + code quality checks)
          npm run test:ci            # Run frontend tests in CI mode (vitest)
        '''
      }
    }

    stage("CI: Test Backend") {
      steps {
        sh '''#!/usr/bin/env bash
          set -e                    # Fail stage if any command fails
          cd "$DEPLOY_DIR/backend"  # Go into backend project folder

          npm ci                    # Install backend dependencies exactly from package-lock.json
          npm test                  # Run backend tests (jest)
        '''
      }
    }

    stage("Build & Push Images") {
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'dockerhub-creds',       // Jenkins stored DockerHub creds
          usernameVariable: 'DOCKER_USER',        // Expose username into env var DOCKER_USER
          passwordVariable: 'DOCKER_PASS'         // Expose password into env var DOCKER_PASS
        )]) {
          sh '''#!/usr/bin/env bash
            set -e                                  # Exit on error

            echo "Using tag: $TAG"                  # Print the tag being used

            # Login to DockerHub so we can push images
            echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin

            # Build backend image using backend/Dockerfile
            docker build -t $DOCKERHUB_USER/it-ticket-system-backend:$TAG ./backend

            # Build frontend image using frontend/Dockerfile
            docker build -t $DOCKERHUB_USER/it-ticket-system-frontend:$TAG ./frontend

            # Push images to DockerHub so Kubernetes can pull them
            docker push $DOCKERHUB_USER/it-ticket-system-backend:$TAG
            docker push $DOCKERHUB_USER/it-ticket-system-frontend:$TAG

            echo "✅ Pushed images:"
            echo "   $DOCKERHUB_USER/it-ticket-system-backend:$TAG"
            echo "   $DOCKERHUB_USER/it-ticket-system-frontend:$TAG"
          '''
        }
      }
    }

    stage("Deploy: Kubernetes (iticket-dev)") {
      steps {
        sh '''#!/usr/bin/env bash
          set -e                                      # Stop if any deploy command fails

          echo "Deploying to namespace: $NAMESPACE"   # Print namespace target
          echo "Deploying image tag: $TAG"            # Print version tag

          # Apply your Kubernetes manifests (deployments/services/hpa/pdb etc.)
          kubectl apply -n "$NAMESPACE" -f k8s.yml

          # Apply ingress for this namespace
          kubectl apply -n "$NAMESPACE" -f ingress-dev.yml

          # Update backend deployment image to the new build tag
          kubectl -n "$NAMESPACE" set image deploy/backend backend=$DOCKERHUB_USER/it-ticket-system-backend:$TAG

          # Update frontend deployment image to the new build tag
          kubectl -n "$NAMESPACE" set image deploy/frontend frontend=$DOCKERHUB_USER/it-ticket-system-frontend:$TAG

          # Wait until backend rollout completes (pods ready)
          kubectl -n "$NAMESPACE" rollout status deployment/backend --timeout=180s

          # Wait until frontend rollout completes (pods ready)
          kubectl -n "$NAMESPACE" rollout status deployment/frontend --timeout=180s

          echo "✅ Kubernetes deploy complete"
        '''
      }
    }

    stage("Smoke test (K8s Ingress)") {
      steps {
        sh '''#!/usr/bin/env bash
          set -e                               # Stop if any smoke check fails
          sleep 5                              # Give pods/ingress a moment

          echo "Checking backend health via ingress..."
          curl -fsS http://localhost:$INGRESS_PORT/health > /dev/null

          echo "Checking frontend via ingress..."
          curl -fsS http://localhost:$INGRESS_PORT/ > /dev/null

          echo "Checking /api/tickets (should be 401 without token)..."
          code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$INGRESS_PORT/api/tickets)

          # Accept 401 (expected without JWT) or 200 (if you later allow public access)
          if [ "$code" != "401" ] && [ "$code" != "200" ]; then
            echo "❌ Unexpected HTTP status from /api/tickets: $code"
            exit 1
          fi

          echo "✅ Smoke test OK"
        '''
      }
    }

    stage("Post-Deploy: Health Check") {
      steps {
        sh '''#!/usr/bin/env bash
          set -e

          # This stage is an extra safety check.
          # Use ingress port (K8s), not docker-compose localhost/api.

          code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$INGRESS_PORT/api/tickets)

          if [ "$code" != "401" ] && [ "$code" != "200" ]; then
            echo "❌ Health check failed: /api/tickets returned HTTP $code"
            exit 1
          fi

          echo "✅ Health check passed."
        '''
      }
    }
  }

  post {
    always {
      echo "pipeline completed"     // Always prints even if pipeline fails (good for logs)
    }
  }
}

