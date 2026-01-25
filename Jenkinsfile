pipeline {
  agent any


  environment {
    DEPLOY_DIR = "/opt/it-ticket-system"
 
  }

  stages {
    stage("checkout") {
      steps {
        checkout scm
 
      }
    }

    stage("sync to deploy dir") {
      steps {
        sh '''
          set -e
          rsync -av --delete --exclude ".git" ./ "${DEPLOY_DIR}/"
          '''
      }
    }

    stage("Build and Deploy Docker compose") {
      steps {
      sh '''
        set -e
        cd "${$DEPLOY_DIR}"

        # build container from latest code
        docker compose build

        # restart containers with new images
        docker compose up -d

        # optional: show running containers
        docker ps

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

  







