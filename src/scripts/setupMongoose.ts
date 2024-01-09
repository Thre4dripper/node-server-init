import path from 'node:path'
import fs from 'fs/promises'
import shell from 'shelljs'

class SetupMongoose {
    public static async init(projectLocation: string) {
        await this.envSetup(projectLocation)
        await this.dependencies(projectLocation)
        await this.changeRepository(projectLocation)
        await this.changeService(projectLocation)
        await this.changeModels(projectLocation)
        await this.removeSequelizeConfig(projectLocation)
        await this.editServer(projectLocation)
    }

    private static async envSetup(projectLocation: string) {
        // create .env file from .env.sample
        const envSampleLocation = path.join(projectLocation, '.env.sample')
        const envSampleContents = await fs.readFile(envSampleLocation, 'utf8')

        let envContents = envSampleContents.replace('DB_DIALECT=mongodb', 'DB_DIALECT=mongodb')
        envContents = envContents.replace('MONGO_URI=mongodb://127.0.0.1:27017/Test', 'MONGO_URI=mongodb://127.0.0.1:27017/YourDatabaseName')

        // remove sequelize related env variables
        const sequelizeEnvVariables = ['#', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASS']
        const envLines = envContents.split('\n')
        const filteredEnvLines = envLines.filter(line => !sequelizeEnvVariables.some(variable => line.startsWith(variable)))
        envContents = filteredEnvLines.join('\n')

        const envLocation = path.join(projectLocation, '.env')
        await fs.writeFile(envLocation, envContents)
    }

    private static async dependencies(projectLocation: string) {
        const packageJsonLocation = path.join(projectLocation, 'package.json')
        const packageJsonContents = await fs.readFile(packageJsonLocation, 'utf8')

        const packageJson = JSON.parse(packageJsonContents)

        //get latest mongoose version
        const mongooseVersion = shell.exec('npm view mongoose version', { silent: true }).stdout.trim()

        packageJson.dependencies.mongoose = `^${mongooseVersion}`

        //remove sequelize dependencies
        delete packageJson.dependencies['pg-hstore']
        delete packageJson.dependencies['pg']

        await fs.writeFile(packageJsonLocation, JSON.stringify(packageJson, null, 2))
    }

    private static async changeRepository(projectLocation: string) {
        const sequelizeRepo = path.join(projectLocation, 'src', 'app', 'apis', 'user', 'repositories', 'sequelize.user.repository.ts')
        await fs.rm(sequelizeRepo)

        const mongoRepo = path.join(projectLocation, 'src', 'app', 'apis', 'user', 'repositories', 'mongoose.user.repository.ts')
        const mongoRepoContents = await fs.readFile(mongoRepo, 'utf8')
        const mongoRepoContentsModified = mongoRepoContents.replace('import User from \'../../../models/mongoose.user.model\'', 'import User from \'../../../models/user.model\'')
        await fs.writeFile(mongoRepo, mongoRepoContentsModified)
        await fs.rename(mongoRepo, path.join(projectLocation, 'src', 'app', 'apis', 'user', 'repositories', 'user.repository.ts'))
    }

    private static async changeService(projectLocation: string) {
        const service = path.join(projectLocation, 'src', 'app', 'apis', 'user', 'services', 'user.service.ts')
        const serviceContents = await fs.readFile(service, 'utf8')
        const serviceContentsModified = serviceContents.replace('import userRepository from \'../repositories/sequelize.user.repository\'', 'import userRepository from \'../repositories/user.repository\'')
        await fs.writeFile(service, serviceContentsModified)
    }

    private static async changeModels(projectLocation: string) {
        const sequelizeModel = path.join(projectLocation, 'src', 'app', 'models', 'sequelize.user.model.ts')
        await fs.rm(sequelizeModel)

        const mongoModel = path.join(projectLocation, 'src', 'app', 'models', 'mongoose.user.model.ts')
        await fs.rename(mongoModel, path.join(projectLocation, 'src', 'app', 'models', 'user.model.ts'))
    }

    private static async removeSequelizeConfig(projectLocation: string) {
        const sequelizeConfig = path.join(projectLocation, 'src', 'config', 'sequelizeConfig.ts')
        await fs.rm(sequelizeConfig)
    }

    private static async editServer(projectLocation: string) {
        const server = path.join(projectLocation, 'src', 'server.ts')
        const serverContents = await fs.readFile(server, 'utf8')

        const serverContentLines = serverContents.split('\n')
        // const linesToBeRemoved = [5, 19, 20, 21, 22, 25, 26, 27, 28, 29, 30, 31, 32, 39]
        const linesToBeRemoved: number[] = []
        const sequelizeImportLineIndex = serverContentLines.findIndex(line => line.includes('sequelizeConnect'))
        linesToBeRemoved.push(sequelizeImportLineIndex + 1)

        //remove sequelize dialect valid check
        const dialectValidLineStartIndex = serverContentLines.findIndex(line => line.includes('start if dialect valid'))
        const dialectValidLineEndIndex = serverContentLines.findIndex(line => line.includes('end if dialect valid'))

        for (let i = dialectValidLineStartIndex; i <= dialectValidLineEndIndex; i++) {
            linesToBeRemoved.push(i + 1)
        }

        //remove sequelize dialect check for sequelize
        const sequelizeDialectCheckStartIndex = serverContentLines.findIndex(line => line.includes('start if sequelize dialect check'))
        const sequelizeDialectCheckEndIndex = serverContentLines.findIndex(line => line.includes('end if sequelize dialect check'))

        for (let i = sequelizeDialectCheckStartIndex; i <= sequelizeDialectCheckEndIndex; i++) {
            linesToBeRemoved.push(i + 1)
        }

        const mongooseDialectCheckStartIndex = serverContentLines.findIndex(line => line.includes('start if mongoose dialect check'))
        const mongooseDialectCheckEndIndex = serverContentLines.findIndex(line => line.includes('end if mongoose dialect check'))

        //removing mongoose dialect check if condition, start two lines and end two lines including comments
        linesToBeRemoved.push(mongooseDialectCheckStartIndex + 1)
        linesToBeRemoved.push(mongooseDialectCheckStartIndex + 2)
        linesToBeRemoved.push(mongooseDialectCheckEndIndex)
        linesToBeRemoved.push(mongooseDialectCheckEndIndex + 1)

        const filteredServerContentLines = serverContentLines.filter((_, index) => !linesToBeRemoved.includes(index + 1))
        const serverContentsModified = filteredServerContentLines.join('\n')

        await fs.writeFile(server, serverContentsModified)
    }
}

export default SetupMongoose