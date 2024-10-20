import { ProjectConfig } from '../prompts/interfaces';
import fs from 'fs/promises';
import path from 'node:path';
import { ApiType } from '../prompts/enums';

class SetupReadme {
    public static async init(projectConfig: ProjectConfig) {
        // remove database setup from readme
        await this.removeDatabaseSetup(projectConfig);

        // configure http methods
        await this.configureHttpMethods(projectConfig);

        // remove socket config from readme if socket is not selected
        if (!projectConfig.socket) {
            await this.removeSocketConfig(projectConfig);
        }

        // remove cron config from readme if cron is not selected
        if (!projectConfig.cron) {
            await this.removeCronConfig(projectConfig);
        }

        // remove docker setup from readme if docker is not selected
        if (!projectConfig.docker) {
            await this.removeDockerSetup(projectConfig);
        }

        // modify installation
        await this.modifyInstallation(projectConfig);
    }

    private static async removeDatabaseSetup(projectConfig: ProjectConfig) {
        const projectLocation = projectConfig.projectLocation;
        const readmeLocation = path.join(projectLocation, 'README.md');
        const readmeContents = await fs.readFile(readmeLocation, 'utf8');
        const readmeLines = readmeContents.split('\n');

        const linesToBeRemoved: number[] = [];

        // remove database setup from readme
        const databaseSetupStartIndex = readmeLines.findIndex((line) =>
            line.includes('### Database Setup')
        );
        const databaseSetupEndIndex = readmeLines.findIndex((line) =>
            line.includes('## Creating APIs')
        );

        for (let i = databaseSetupStartIndex; i < databaseSetupEndIndex; i++) {
            linesToBeRemoved.push(i);
        }

        // Write the modified readme file
        const filteredReadmeLines = readmeLines.filter(
            (_, index) => !linesToBeRemoved.includes(index)
        );

        const readmeModified = filteredReadmeLines.join('\n');
        await fs.writeFile(readmeLocation, readmeModified);
    }

    private static async configureHttpMethods(projectConfig: ProjectConfig) {
        const projectLocation = projectConfig.projectLocation;
        const readmeLocation = path.join(projectLocation, 'README.md');
        const readmeContents = await fs.readFile(readmeLocation, 'utf8');
        const readmeLines = readmeContents.split('\n');

        const linesToBeRemoved: number[] = [];

        const allApiTypes = Object.values(ApiType);

        const selectedApiTypes = projectConfig.apis
            .filter((api) => api.require)
            .map((api) => api.type);

        const apiTypesToBeRemoved = allApiTypes.filter(
            (apiType) => !selectedApiTypes.includes(apiType)
        );

        apiTypesToBeRemoved.forEach((type) => {
            const typeStartIndex = readmeLines.findIndex((line) =>
                line.includes(`Controller.${type}`)
            );
            const typeEndIndex = readmeLines.findIndex(
                (line, index) => line.includes('])') && index > typeStartIndex
            );

            for (let i = typeStartIndex; i <= typeEndIndex; i++) {
                linesToBeRemoved.push(i);
            }
        });

        // Write the modified readme file
        const filteredReadmeLines = readmeLines.filter(
            (_, index) => !linesToBeRemoved.includes(index)
        );

        const readmeModified = filteredReadmeLines.join('\n');
        await fs.writeFile(readmeLocation, readmeModified);
    }

    private static async removeSocketConfig(projectConfig: ProjectConfig) {
        const projectLocation = projectConfig.projectLocation;
        const readmeLocation = path.join(projectLocation, 'README.md');
        const readmeContents = await fs.readFile(readmeLocation, 'utf8');
        const readmeLines = readmeContents.split('\n');

        const linesToBeRemoved: number[] = [];

        // remove from controller in readme
        const socketControllerStartIndex = readmeLines.findIndex((line) =>
            line.includes('// socket controller function')
        );
        const socketControllerEndIndex = readmeLines.findIndex(
            (line, index) => line.includes('}') && index > socketControllerStartIndex
        );

        for (let i = socketControllerStartIndex; i <= socketControllerEndIndex; i++) {
            linesToBeRemoved.push(i);
        }

        // remove socket controller params
        const socketControllerParamsStartIndex = readmeLines.findIndex((line) =>
            line.includes('#### socketController Parameters')
        );
        const socketControllerParamsEndIndex = readmeLines.findIndex(
            (line, index) =>
                line.includes('- **payload:** Data sent from the client') &&
                index > socketControllerParamsStartIndex
        );

        for (let i = socketControllerParamsStartIndex; i <= socketControllerParamsEndIndex; i++) {
            linesToBeRemoved.push(i);
        }

        // remove socket from router
        const socketRouterStartIndex = readmeLines.findIndex((line) =>
            line.includes('// Socket Events')
        );
        const socketRouterEndIndex = readmeLines.findIndex(
            (line, index) => line.includes('}') && index > socketRouterStartIndex
        );

        for (let i = socketRouterStartIndex; i <= socketRouterEndIndex - 1; i++) {
            linesToBeRemoved.push(i);
        }

        // Write the modified readme file
        const filteredReadmeLines = readmeLines.filter(
            (_, index) => !linesToBeRemoved.includes(index)
        );

        const readmeModified = filteredReadmeLines.join('\n');
        await fs.writeFile(readmeLocation, readmeModified);
    }

    private static async removeCronConfig(projectConfig: ProjectConfig) {
        const projectLocation = projectConfig.projectLocation;
        const readmeLocation = path.join(projectLocation, 'README.md');
        const readmeContents = await fs.readFile(readmeLocation, 'utf8');
        const readmeLines = readmeContents.split('\n');

        const linesToBeRemoved: number[] = [];

        // remove from controller in readme
        const cronControllerStartIndex = readmeLines.findIndex((line) =>
            line.includes('// cron controller function')
        );
        const cronControllerEndIndex = readmeLines.findIndex(
            (line, index) => line.includes('}') && index > cronControllerStartIndex
        );

        for (let i = cronControllerStartIndex; i <= cronControllerEndIndex; i++) {
            linesToBeRemoved.push(i);
        }

        // remove cron config from readme
        const cronConfigStartIndex = readmeLines.findIndex((line) =>
            line.includes('### Cron File')
        );
        const cronConfigEndIndex = readmeLines.findIndex((line) => line.includes('## Docker'));

        for (let i = cronConfigStartIndex; i < cronConfigEndIndex; i++) {
            linesToBeRemoved.push(i);
        }

        // Write the modified readme file
        const filteredReadmeLines = readmeLines.filter(
            (_, index) => !linesToBeRemoved.includes(index)
        );

        const readmeModified = filteredReadmeLines.join('\n');
        await fs.writeFile(readmeLocation, readmeModified);
    }

    private static async removeDockerSetup(projectConfig: ProjectConfig) {
        const projectLocation = projectConfig.projectLocation;
        const readmeLocation = path.join(projectLocation, 'README.md');
        const readmeContents = await fs.readFile(readmeLocation, 'utf8');
        const readmeLines = readmeContents.split('\n');

        const linesToBeRemoved: number[] = [];

        const dockerSetupStartIndex = readmeLines.findIndex((line) => line.includes('## Docker'));
        const dockerSetupEndIndex = readmeLines.findIndex((line) =>
            line.includes('### Contributing')
        );

        for (let i = dockerSetupStartIndex; i < dockerSetupEndIndex; i++) {
            linesToBeRemoved.push(i);
        }

        // Write the modified readme file
        const filteredReadmeLines = readmeLines.filter(
            (_, index) => !linesToBeRemoved.includes(index)
        );

        const readmeModified = filteredReadmeLines.join('\n');
        await fs.writeFile(readmeLocation, readmeModified);
    }

    private static async modifyInstallation(projectConfig: ProjectConfig) {
        const projectLocation = projectConfig.projectLocation;
        const readmeLocation = path.join(projectLocation, 'README.md');
        const readmeContents = await fs.readFile(readmeLocation, 'utf8');
        const readmeLines = readmeContents.split('\n');

        const linesToBeRemoved: number[] = [];

        const installationStartIndex = readmeLines.findIndex((line) =>
            line.includes('### Automated (CLI Tool)')
        );
        const installationEndIndex = readmeLines.findIndex((line) =>
            line.includes('#### Install dependencies')
        );

        for (let i = installationStartIndex; i < installationEndIndex; i++) {
            linesToBeRemoved.push(i);
        }

        // Write the modified readme file
        const filteredReadmeLines = readmeLines.filter(
            (_, index) => !linesToBeRemoved.includes(index)
        );

        const readmeModified = filteredReadmeLines.join('\n');
        await fs.writeFile(readmeLocation, readmeModified);
    }
}

export default SetupReadme;
