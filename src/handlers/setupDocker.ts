import path from 'node:path'
import fs from 'fs/promises'

class SetupDocker {
    public static async init(projectLocation: string, docker: boolean) {
        // if docker is required then no need to delete docker files
        if (docker) {
            return
        }

        //remove docker files
        const dockerfileDevLocation = path.join(projectLocation, 'Dockerfile-dev')
        const dockerfileProdLocation = path.join(projectLocation, 'Dockerfile-prod')

        await fs.rm(dockerfileDevLocation)
        await fs.rm(dockerfileProdLocation)

        const dockerComposeLocation = path.join(projectLocation, 'docker-compose.yml')
        await fs.rm(dockerComposeLocation)

        const dockerIgnoreLocation = path.join(projectLocation, '.dockerignore')
        await fs.rm(dockerIgnoreLocation)
    }
}

export default SetupDocker
