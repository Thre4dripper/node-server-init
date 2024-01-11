import path from 'node:path'
import fs from 'fs/promises'
import { getLatestVersion } from './utils'
import { ProjectType } from '../prompts/enums'

class SetupMongoose {
    public static async init(projectLocation: string, projectType: ProjectType) {
        await this.envSetup(projectLocation)
        await this.dependencies(projectLocation)
        await this.changeRepository(projectLocation, projectType)
        await this.changeService(projectLocation, projectType)
        await this.changeModels(projectLocation, projectType)
        await this.removeSequelizeConfig(projectLocation, projectType)
        await this.editServer(projectLocation, projectType)
    }

    private static async envSetup(projectLocation: string) {
        // create .env file from .env.sample
        const envSampleLocation = path.join(projectLocation, '.env.sample')
        const envSampleContents = await fs.readFile(envSampleLocation, 'utf8')

        let envContents = envSampleContents.replace('DB_DIALECT=mongodb', 'DB_DIALECT=mongodb')
        envContents = envContents.replace(
            'MONGO_URI=mongodb://127.0.0.1:27017/Test',
            'MONGO_URI=mongodb://127.0.0.1:27017/YourDatabaseName'
        )

        // remove sequelize related env variables
        const sequelizeEnvVariables = ['#', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASS']
        const envLines = envContents.split('\n')
        const filteredEnvLines = envLines.filter(
            (line) => !sequelizeEnvVariables.some((variable) => line.startsWith(variable))
        )
        envContents = filteredEnvLines.join('\n')

        const envLocation = path.join(projectLocation, '.env')
        await fs.writeFile(envLocation, envContents)
    }

    private static async dependencies(projectLocation: string) {
        const packageJsonLocation = path.join(projectLocation, 'package.json')
        const packageJsonContents = await fs.readFile(packageJsonLocation, 'utf8')

        const packageJson = JSON.parse(packageJsonContents)

        //get latest mongoose version
        const mongooseVersion = await getLatestVersion('mongoose')

        packageJson.dependencies.mongoose = `^${mongooseVersion}`

        //remove sequelize dependencies
        delete packageJson.dependencies['pg-hstore']
        delete packageJson.dependencies['pg']
        delete packageJson.dependencies['sequelize']
        delete packageJson.dependencies['sequelize-typescript']

        await fs.writeFile(packageJsonLocation, JSON.stringify(packageJson, null, 2))
    }

    private static async changeRepository(projectLocation: string, projectType: ProjectType) {
        const sequelizeRepo = path.join(
            projectLocation,
            'src',
            'app',
            'apis',
            'user',
            'repositories',
            `sequelize.user.repository.${projectType}`
        )
        await fs.rm(sequelizeRepo)

        const mongoRepo = path.join(
            projectLocation,
            'src',
            'app',
            'apis',
            'user',
            'repositories',
            `mongoose.user.repository.${projectType}`
        )
        const mongoRepoContents = await fs.readFile(mongoRepo, 'utf8')
        const mongoRepoContentsModified = mongoRepoContents.replace(
            "import User from '../../../models/mongoose.user.model'",
            "import User from '../../../models/user.model'"
        )
        await fs.writeFile(mongoRepo, mongoRepoContentsModified)
        await fs.rename(
            mongoRepo,
            path.join(
                projectLocation,
                'src',
                'app',
                'apis',
                'user',
                'repositories',
                `user.repository.${projectType}`
            )
        )
    }

    private static async changeService(projectLocation: string, projectType: ProjectType) {
        const service = path.join(
            projectLocation,
            'src',
            'app',
            'apis',
            'user',
            'services',
            `user.service.${projectType}`
        )
        const serviceContents = await fs.readFile(service, 'utf8')
        const regex = /import userRepository from '..\/repositories\/.*.user.repository'/g
        const serviceContentsModified = serviceContents.replace(
            regex,
            "import userRepository from '../repositories/user.repository'"
        )
        await fs.writeFile(service, serviceContentsModified)
    }

    private static async changeModels(projectLocation: string, projectType: ProjectType) {
        const sequelizeModel = path.join(
            projectLocation,
            'src',
            'app',
            'models',
            `sequelize.user.model.${projectType}`
        )
        await fs.rm(sequelizeModel)

        const mongoModel = path.join(
            projectLocation,
            'src',
            'app',
            'models',
            `mongoose.user.model.${projectType}`
        )
        await fs.rename(
            mongoModel,
            path.join(projectLocation, 'src', 'app', 'models', `user.model.${projectType}`)
        )
    }

    private static async removeSequelizeConfig(projectLocation: string, projectType: ProjectType) {
        const sequelizeConfig = path.join(
            projectLocation,
            'src',
            'config',
            `sequelizeConfig.${projectType}`
        )
        await fs.rm(sequelizeConfig)
    }

    private static async editServer(projectLocation: string, projectType: ProjectType) {
        const server = path.join(projectLocation, 'src', `server.${projectType}`)
        const serverContents = await fs.readFile(server, 'utf8')

        const serverContentLines = serverContents.split('\n')
        const linesToBeRemoved: number[] = []
        const sequelizeImportLineIndex = serverContentLines.findIndex((line) =>
            line.includes('sequelizeConnect')
        )
        linesToBeRemoved.push(sequelizeImportLineIndex + 1)

        //remove dialect valid check
        const dialectValidLineStartIndex = serverContentLines.findIndex((line) =>
            line.includes('start if dialect valid')
        )
        const dialectValidLineEndIndex = serverContentLines.findIndex((line) =>
            line.includes('end if dialect valid')
        )

        for (let i = dialectValidLineStartIndex; i <= dialectValidLineEndIndex; i++) {
            linesToBeRemoved.push(i + 1)
        }

        //remove sequelize dialect check for sequelize
        const sequelizeDialectCheckStartIndex = serverContentLines.findIndex((line) =>
            line.includes('start if sequelize dialect check')
        )
        const sequelizeDialectCheckEndIndex = serverContentLines.findIndex((line) =>
            line.includes('end if sequelize dialect check')
        )

        for (let i = sequelizeDialectCheckStartIndex; i <= sequelizeDialectCheckEndIndex; i++) {
            linesToBeRemoved.push(i + 1)
        }

        const mongooseDialectCheckStartIndex = serverContentLines.findIndex((line) =>
            line.includes('start if mongoose dialect check')
        )
        const mongooseDialectCheckStartIfLineIndex = serverContentLines.findIndex(
            (line, index) => line.includes('{') && index > mongooseDialectCheckStartIndex
        )
        const mongooseDialectCheckEndIndex = serverContentLines.findIndex((line) =>
            line.includes('end if mongoose dialect check')
        )

        //removing mongoose dialect check if condition
        for (
            let i = mongooseDialectCheckStartIndex;
            i <= mongooseDialectCheckStartIfLineIndex;
            i++
        ) {
            linesToBeRemoved.push(i + 1)
        }

        linesToBeRemoved.push(mongooseDialectCheckEndIndex)
        linesToBeRemoved.push(mongooseDialectCheckEndIndex + 1)

        const filteredServerContentLines = serverContentLines.filter(
            (_, index) => !linesToBeRemoved.includes(index + 1)
        )
        const serverContentsModified = filteredServerContentLines.join('\n')

        await fs.writeFile(server, serverContentsModified)
    }
}

export default SetupMongoose
