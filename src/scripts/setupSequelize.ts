import { Database } from '../prompts/enums'
import path from 'node:path'
import fs from 'fs/promises'
import shell from 'shelljs'

class SetupSequelize {
    public static async init(projectLocation: string, database: Database) {
        await this.envSetup(projectLocation, database)
        await this.dependencies(projectLocation, database)
        await this.changeRepository(projectLocation)
        await this.changeService(projectLocation)
        await this.changeModels(projectLocation)
        await this.removeMongooseConfig(projectLocation)
        await this.editServer(projectLocation)
    }

    private static async envSetup(projectLocation: string, database: Database) {
        // create .env file from .env.sample
        const envSampleLocation = path.join(projectLocation, '.env.sample')
        const envSampleContents = await fs.readFile(envSampleLocation, 'utf8')

        let envContents = envSampleContents.replace('DB_DIALECT=mongodb', `DB_DIALECT=${database}`)
        .replace('DB_HOST=localhost', 'DB_HOST=localhost')
        .replace('DB_PORT=5432', 'DB_PORT=5432')
        .replace('DB_NAME=postgres', 'DB_NAME=YourDatabaseName')
        .replace('DB_USER=postgres', 'DB_USER=YourDatabaseUsername')
        .replace('DB_PASS=password', 'DB_PASS=YourDatabasePassword')

        // remove mongoose related env variables
        const mongooseEnvVariables = ['#', 'MONGO_URI']
        const envLines = envContents.split('\n')
        const filteredEnvLines = envLines.filter(line => !mongooseEnvVariables.some(variable => line.startsWith(variable)))
        envContents = filteredEnvLines.join('\n')

        const envLocation = path.join(projectLocation, '.env')
        await fs.writeFile(envLocation, envContents)
    }

    private static async dependencies(projectLocation: string, database: Database) {
        const packageJsonLocation = path.join(projectLocation, 'package.json')
        const packageJsonContents = await fs.readFile(packageJsonLocation, 'utf8')

        const packageJson = JSON.parse(packageJsonContents)

        //get latest database version
        switch (database) {
            case Database.Postgres:
                const pgVersion = shell.exec('npm view pg version', { silent: true }).stdout.trim()
                const pgHstoreVersion = shell.exec('npm view pg-hstore version', { silent: true }).stdout.trim()

                packageJson.dependencies['pg-hstore'] = `^${pgHstoreVersion}`
                packageJson.dependencies.pg = `^${pgVersion}`
                break
            case Database.Mysql:
                const mysqlVersion = shell.exec('npm view mysql2 version', { silent: true }).stdout.trim()

                packageJson.dependencies.mysql = `^${mysqlVersion}`
                break
            case Database.Sqlite:
                const sqliteVersion = shell.exec('npm view sqlite3 version', { silent: true }).stdout.trim()

                packageJson.dependencies.sqlite3 = `^${sqliteVersion}`
                break
            case Database.Mssql:
                const mssqlVersion = shell.exec('npm view mssql version', { silent: true }).stdout.trim()

                packageJson.dependencies.mssql = `^${mssqlVersion}`
                break
            case Database.MariaDB:
                const mariadbVersion = shell.exec('npm view mariadb version', { silent: true }).stdout.trim()

                packageJson.dependencies.mariadb = `^${mariadbVersion}`
                break
            case Database.DB2:
                const ibmDbVersion = shell.exec('npm view ibm_db version', { silent: true }).stdout.trim()

                packageJson.dependencies.ibm_db = `^${ibmDbVersion}`
                break
            case Database.Snowflake:
                const snowflakeVersion = shell.exec('npm view snowflake-sdk version', { silent: true }).stdout.trim()

                packageJson.dependencies['snowflake-sdk'] = `^${snowflakeVersion}`
                break
            case Database.Oracle:
                const oracledbVersion = shell.exec('npm view oracledb version', { silent: true }).stdout.trim()

                packageJson.dependencies.oracledb = `^${oracledbVersion}`
                break
        }


        //remove mongoose dependencies
        delete packageJson.dependencies.mongoose

        await fs.writeFile(packageJsonLocation, JSON.stringify(packageJson, null, 2))
    }

    private static async changeRepository(projectLocation: string) {
        const mongooseRepo = path.join(projectLocation, 'src', 'app', 'apis', 'user', 'repositories', 'mongoose.user.repository.ts')
        await fs.rm(mongooseRepo)

        const sequelizeRepo = path.join(projectLocation, 'src', 'app', 'apis', 'user', 'repositories', 'sequelize.user.repository.ts')
        const sequelizeRepoContents = await fs.readFile(sequelizeRepo, 'utf8')
        const sequelizeRepoContentsModified = sequelizeRepoContents.replace('import User from \'../../../models/sequelize.user.model\'', 'import User from \'../../../models/user.model\'')
        await fs.writeFile(sequelizeRepo, sequelizeRepoContentsModified)
        await fs.rename(sequelizeRepo, path.join(projectLocation, 'src', 'app', 'apis', 'user', 'repositories', 'user.repository.ts'))
    }

    private static async changeService(projectLocation: string) {
        const service = path.join(projectLocation, 'src', 'app', 'apis', 'user', 'services', 'user.service.ts')
        const serviceContents = await fs.readFile(service, 'utf8')
        const regex = /import userRepository from '..\/repositories\/.*.user.repository'/g
        const serviceContentsModified = serviceContents.replace(regex, 'import userRepository from \'../repositories/user.repository\'')
        await fs.writeFile(service, serviceContentsModified)
    }

    private static async changeModels(projectLocation: string) {
        const mongooseModel = path.join(projectLocation, 'src', 'app', 'models', 'mongoose.user.model.ts')
        await fs.rm(mongooseModel)

        const sequelizeModel = path.join(projectLocation, 'src', 'app', 'models', 'sequelize.user.model.ts')
        await fs.rename(sequelizeModel, path.join(projectLocation, 'src', 'app', 'models', 'user.model.ts'))
    }

    private static async removeMongooseConfig(projectLocation: string) {
        const mongooseConfig = path.join(projectLocation, 'src', 'config', 'mongooseConfig.ts')
        await fs.rm(mongooseConfig)
    }

    private static async editServer(projectLocation: string) {
        const server = path.join(projectLocation, 'src', 'server.ts')
        const serverContents = await fs.readFile(server, 'utf8')

        const serverContentLines = serverContents.split('\n')

        const linesToBeRemoved: number[] = []
        const mongooseImportLineIndex = serverContentLines.findIndex(line => line.includes('mongooseConfig'))
        linesToBeRemoved.push(mongooseImportLineIndex + 1)

        //remove dialect valid check
        const dialectValidLineStartIndex = serverContentLines.findIndex(line => line.includes('start if dialect valid'))
        const dialectValidLineEndIndex = serverContentLines.findIndex(line => line.includes('end if dialect valid'))

        for (let i = dialectValidLineStartIndex; i <= dialectValidLineEndIndex; i++) {
            linesToBeRemoved.push(i + 1)
        }

        //remove mongoose dialect check
        const mongooseDialectCheckStartIndex = serverContentLines.findIndex(line => line.includes('start if mongoose dialect check'))
        const mongooseDialectCheckEndIndex = serverContentLines.findIndex(line => line.includes('end if mongoose dialect check'))

        for (let i = mongooseDialectCheckStartIndex; i <= mongooseDialectCheckEndIndex; i++) {
            linesToBeRemoved.push(i + 1)
        }

        const sequelizeDialectCheckStartIndex = serverContentLines.findIndex(line => line.includes('start if sequelize dialect check'))
        const sequelizeDialectCheckStartIfLineIndex = serverContentLines.findIndex((line, index) => line.includes('{') && index > sequelizeDialectCheckStartIndex)
        const sequelizeDialectCheckEndIndex = serverContentLines.findIndex(line => line.includes('end if sequelize dialect check'))

        //removing sequelize dialect check if condition
        for (let i = sequelizeDialectCheckStartIndex; i <= sequelizeDialectCheckStartIfLineIndex; i++) {
            linesToBeRemoved.push(i + 1)
        }

        linesToBeRemoved.push(sequelizeDialectCheckEndIndex)
        linesToBeRemoved.push(sequelizeDialectCheckEndIndex + 1)


        const filteredServerContentLines = serverContentLines.filter((_, index) => !linesToBeRemoved.includes(index + 1))
        const serverContentsModified = filteredServerContentLines.join('\n')

        await fs.writeFile(server, serverContentsModified)
    }
}

export default SetupSequelize