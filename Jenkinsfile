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

    stage("Deploy: Docker Compose Up") {
      steps {
        sh '''
          set -e
          cd "$DEPLOY_DIR"

          # Make sure backend env exists on the server
          if [ ! -f "$DEPLOY_DIR/backend/.env" ]; then
            echo "ERROR: backend/.env is missing on server at $DEPLOY_DIR/backend/.env"
            exit 1
          fi

          docker compose down
          docker compose build
          docker compose up -d
          docker ps
        '''
      }
    }

    stage("Smoke test") {
  steps {
    sh '''#!/usr/bin/env bash
      set -e
      sleep 5
      
      echo "checking backend health..."
      curl -fsS http://localhost/health > /dev/null

      echo "checking frontend health..."
      curl -fsS http://localhost/ > /dev/null

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

