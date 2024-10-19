import { Database, ProjectType } from '../prompts/enums';
import path from 'node:path';
import fs from 'fs/promises';
import { getLatestVersion } from '../scripts/utils';

class SetupSequelize {
    public static async init(
        projectLocation: string,
        database: Database,
        projectType: ProjectType
    ) {
        await this.envSetup(projectLocation, database);
        await this.dependencies(projectLocation, database);
        await this.changeRepository(projectLocation, projectType);
        await this.changeService(projectLocation, projectType);
        await this.changeModels(projectLocation, projectType);
        await this.removeMongooseConfig(projectLocation, projectType);
        await this.editServer(projectLocation, projectType);
    }

    private static async envSetup(projectLocation: string, database: Database) {
        // create .env file from .env.sample
        const envSampleLocation = path.join(projectLocation, '.env.sample');
        const envSampleContents = await fs.readFile(envSampleLocation, 'utf8');

        let envContents = envSampleContents
            .replace('DB_DIALECT=mongodb', `DB_DIALECT=${database}`)
            .replace('DB_HOST=localhost', 'DB_HOST=localhost')
            .replace('DB_PORT=5432', 'DB_PORT=5432')
            .replace('DB_NAME=postgres', 'DB_NAME=YourDatabaseName')
            .replace('DB_USER=postgres', 'DB_USER=YourDatabaseUsername')
            .replace('DB_PASS=password', 'DB_PASS=YourDatabasePassword');

        // remove mongoose related env variables
        const mongooseEnvVariables = ['#', 'MONGO_URI'];
        const envLines = envContents.split('\n');
        const filteredEnvLines = envLines.filter(
            (line) => !mongooseEnvVariables.some((variable) => line.startsWith(variable))
        );
        envContents = filteredEnvLines.join('\n');

        const envLocation = path.join(projectLocation, '.env');
        await fs.writeFile(envLocation, envContents);
    }

    private static async dependencies(projectLocation: string, database: Database) {
        const packageJsonLocation = path.join(projectLocation, 'package.json');
        const packageJsonContents = await fs.readFile(packageJsonLocation, 'utf8');

        const packageJson = JSON.parse(packageJsonContents);

        //remove unnecessary dependencies
        delete packageJson.dependencies.mongoose;
        delete packageJson.dependencies.pg;
        delete packageJson.dependencies['pg-hstore'];

        //get latest database version
        switch (database) {
            case Database.Postgres:
                const pgVersion = await getLatestVersion('pg');
                const pgHstoreVersion = await getLatestVersion('pg-hstore');

                packageJson.dependencies['pg-hstore'] = `^${pgHstoreVersion}`;
                packageJson.dependencies.pg = `^${pgVersion}`;
                break;
            case Database.Mysql:
                const mysqlVersion = await getLatestVersion('mysql2');

                packageJson.dependencies.mysql2 = `^${mysqlVersion}`;
                break;
            case Database.Sqlite:
                const sqliteVersion = await getLatestVersion('sqlite');

                packageJson.dependencies.sqlite = `^${sqliteVersion}`;
                break;
            case Database.Mssql:
                const mssqlVersion = await getLatestVersion('mssql');

                packageJson.dependencies.mssql = `^${mssqlVersion}`;
                break;
            case Database.MariaDB:
                const mariadbVersion = await getLatestVersion('mariadb');

                packageJson.dependencies.mariadb = `^${mariadbVersion}`;
                break;
            case Database.DB2:
                const ibmDbVersion = await getLatestVersion('ibm_db');

                packageJson.dependencies.ibm_db = `^${ibmDbVersion}`;
                break;
            case Database.Snowflake:
                const snowflakeVersion = await getLatestVersion('snowflake-sdk');

                packageJson.dependencies['snowflake-sdk'] = `^${snowflakeVersion}`;
                break;
            case Database.Oracle:
                const oracledbVersion = await getLatestVersion('oracledb');

                packageJson.dependencies.oracledb = `^${oracledbVersion}`;
                break;
        }

        await fs.writeFile(packageJsonLocation, JSON.stringify(packageJson, null, 2));
    }

    private static async changeRepository(projectLocation: string, projectType: ProjectType) {
        const mongooseRepo = path.join(
            projectLocation,
            'src',
            'app',
            'apis',
            'user',
            'repositories',
            `mongoose.user.repository.${projectType}`
        );
        await fs.rm(mongooseRepo);

        const sequelizeRepo = path.join(
            projectLocation,
            'src',
            'app',
            'apis',
            'user',
            'repositories',
            `sequelize.user.repository.${projectType}`
        );
        const sequelizeRepoContents = await fs.readFile(sequelizeRepo, 'utf8');
        const regex = /'..\/..\/..\/models\/.*.user.model'/g;
        const sequelizeRepoContentsModified = sequelizeRepoContents.replace(
            regex,
            "'../../../models/user.model'"
        );
        await fs.writeFile(sequelizeRepo, sequelizeRepoContentsModified);
        await fs.rename(
            sequelizeRepo,
            path.join(
                projectLocation,
                'src',
                'app',
                'apis',
                'user',
                'repositories',
                `user.repository.${projectType}`
            )
        );
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
        );
        const serviceContents = await fs.readFile(service, 'utf8');
        const regex = /'..\/repositories\/.*.user.repository'/g;
        const serviceContentsModified = serviceContents.replace(
            regex,
            "'../repositories/user.repository'"
        );
        await fs.writeFile(service, serviceContentsModified);
    }

    private static async changeModels(projectLocation: string, projectType: ProjectType) {
        const mongooseModel = path.join(
            projectLocation,
            'src',
            'app',
            'models',
            `mongoose.user.model.${projectType}`
        );
        await fs.rm(mongooseModel);

        const sequelizeModel = path.join(
            projectLocation,
            'src',
            'app',
            'models',
            `sequelize.user.model.${projectType}`
        );
        await fs.rename(
            sequelizeModel,
            path.join(projectLocation, 'src', 'app', 'models', `user.model.${projectType}`)
        );
    }

    private static async removeMongooseConfig(projectLocation: string, projectType: ProjectType) {
        const mongooseConfig = path.join(
            projectLocation,
            'src',
            'config',
            `mongooseConfig.${projectType}`
        );
        await fs.rm(mongooseConfig);
    }

    private static async editServer(projectLocation: string, projectType: ProjectType) {
        const server = path.join(projectLocation, 'src', `server.${projectType}`);
        const serverContents = await fs.readFile(server, 'utf8');

        const serverContentLines = serverContents.split('\n');

        const linesToBeRemoved: number[] = [];
        const mongooseImportLineIndex = serverContentLines.findIndex((line) =>
            line.includes('mongooseConfig')
        );
        linesToBeRemoved.push(mongooseImportLineIndex + 1);

        //remove dialect valid check
        const dialectValidLineStartIndex = serverContentLines.findIndex((line) =>
            line.includes('start if dialect valid')
        );
        const dialectValidLineEndIndex = serverContentLines.findIndex((line) =>
            line.includes('end if dialect valid')
        );

        for (let i = dialectValidLineStartIndex; i <= dialectValidLineEndIndex; i++) {
            linesToBeRemoved.push(i + 1);
        }

        //remove mongoose dialect check
        const mongooseDialectCheckStartIndex = serverContentLines.findIndex((line) =>
            line.includes('start if mongoose dialect check')
        );
        const mongooseDialectCheckEndIndex = serverContentLines.findIndex((line) =>
            line.includes('end if mongoose dialect check')
        );

        for (let i = mongooseDialectCheckStartIndex; i <= mongooseDialectCheckEndIndex; i++) {
            linesToBeRemoved.push(i + 1);
        }

        const sequelizeDialectCheckStartIndex = serverContentLines.findIndex((line) =>
            line.includes('start if sequelize dialect check')
        );
        const sequelizeDialectCheckStartIfLineIndex = serverContentLines.findIndex(
            (line, index) => line.includes('{') && index > sequelizeDialectCheckStartIndex
        );
        const sequelizeDialectCheckEndIndex = serverContentLines.findIndex((line) =>
            line.includes('end if sequelize dialect check')
        );

        //removing sequelize dialect check if condition
        for (
            let i = sequelizeDialectCheckStartIndex;
            i <= sequelizeDialectCheckStartIfLineIndex;
            i++
        ) {
            linesToBeRemoved.push(i + 1);
        }

        linesToBeRemoved.push(sequelizeDialectCheckEndIndex);
        linesToBeRemoved.push(sequelizeDialectCheckEndIndex + 1);

        const filteredServerContentLines = serverContentLines.filter(
            (_, index) => !linesToBeRemoved.includes(index + 1)
        );
        const serverContentsModified = filteredServerContentLines.join('\n');

        await fs.writeFile(server, serverContentsModified);
    }
}

export default SetupSequelize;
