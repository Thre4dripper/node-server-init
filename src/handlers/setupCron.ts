import fs from 'fs/promises';
import path from 'node:path';
import { ProjectType } from '../prompts/enums';
import { removeAllMarkedBlocks, pruneUnusedLogger } from './markerUtils';

class SetupCron {
    public static async init(projectLocation: string, cron: boolean, projectType: ProjectType) {
        // if cron is required then no need to delete cron files
        if (cron) return;

        await this.dependencies(projectLocation);
        await this.deleteCronConfig(projectLocation, projectType);
        await this.removeFromServer(projectLocation, projectType);
        await this.removeFromMasterController(projectLocation, projectType);
        await this.removeFromHandlers(projectLocation, projectType);
        await this.removeCronFilesAndFolders(projectLocation, projectType);
    }

    private static async dependencies(projectLocation: string) {
        const packageJsonLocation = path.join(projectLocation, 'package.json');
        const packageJson = JSON.parse(await fs.readFile(packageJsonLocation, 'utf8'));
        delete packageJson.dependencies['cron'];
        await fs.writeFile(packageJsonLocation, JSON.stringify(packageJson, null, 2));
    }

    private static async deleteCronConfig(projectLocation: string, projectType: ProjectType) {
        const cronConfig = path.join(projectLocation, 'src', 'config', `cronConfig.${projectType}`);
        await fs.rm(cronConfig);
    }

    private static async removeFromServer(projectLocation: string, projectType: ProjectType) {
        const serverLocation = path.join(projectLocation, 'src', `server.${projectType}`);
        const serverContents = await fs.readFile(serverLocation, 'utf8');
        const serverContentLines = serverContents.split('\n');

        const linesToBeRemoved: number[] = [];

        const cronImportLineIndex = serverContentLines.findIndex((line) =>
            line.includes('CronConfig')
        );

        linesToBeRemoved.push(cronImportLineIndex);

        const cronConfigStartIndex = serverContentLines.findIndex((line) =>
            line.includes('Initialize Cron Jobs')
        );
        const cronConfigEndIndex = serverContentLines.findIndex(
            (line, index) => line.includes('End Initialize') && index > cronConfigStartIndex
        );

        for (let i = cronConfigStartIndex; i <= cronConfigEndIndex; i++) {
            linesToBeRemoved.push(i);
        }

        const filteredServerLines = serverContentLines.filter(
            (_, index) => !linesToBeRemoved.includes(index)
        );
        const serverModified = filteredServerLines.join('\n');
        await fs.writeFile(serverLocation, serverModified);
    }

    private static async removeFromMasterController(
        projectLocation: string,
        projectType: ProjectType
    ) {
        const masterControllerLocation = path.join(
            projectLocation,
            'src',
            'app',
            'utils',
            `MasterController.${projectType}`
        );
        const masterControllerContents = await fs.readFile(masterControllerLocation, 'utf8');

        const masterControllerLines = masterControllerContents.split('\n');

        const linesToBeRemoved: number[] = [];

        //remove cron import line
        const cronImportLineIndex = masterControllerLines.findIndex((line) =>
            line.includes('CronConfig')
        );

        linesToBeRemoved.push(cronImportLineIndex);

        //remove interface
        const cronInterfaceStartIndex = masterControllerLines.findIndex((line) =>
            line.includes('ICronJob')
        );
        const cronInterfaceEndIndex = masterControllerLines.findIndex(
            (line, index) => line.includes('}') && index > cronInterfaceStartIndex
        );

        for (let i = cronInterfaceStartIndex; i <= cronInterfaceEndIndex; i++) {
            linesToBeRemoved.push(i);
        }

        //remove cron requests snippet
        const cronRequestSnippetStartIndex = masterControllerLines.findIndex((line) =>
            line.includes('start cron jobs snippet')
        );
        const cronRequestSnippetEndIndex = masterControllerLines.findIndex((line) =>
            line.includes('end cron jobs snippet')
        );

        for (let i = cronRequestSnippetStartIndex; i <= cronRequestSnippetEndIndex; i++) {
            linesToBeRemoved.push(i);
        }

        //removing cron controller method (marker-delimited for resilience)
        const cronControllerMarkerStart = masterControllerLines.findIndex((line) =>
            line.includes('start cron controller method')
        );
        const cronControllerMarkerEnd = masterControllerLines.findIndex(
            (line, index) =>
                line.includes('end cron controller method') && index > cronControllerMarkerStart
        );

        if (cronControllerMarkerStart !== -1 && cronControllerMarkerEnd !== -1) {
            for (let i = cronControllerMarkerStart; i <= cronControllerMarkerEnd; i++) {
                linesToBeRemoved.push(i);
            }
        }

        //removing cron from master controller
        const cronDocStartIndex = masterControllerLines.findIndex((line) =>
            line.includes('MasterController.cronJob')
        );
        const cronStartIndex = masterControllerLines.findIndex((line) =>
            line.includes('static cronJob(')
        );
        const cronEndIndex =
            masterControllerLines.findIndex(
                (line, index) => line.includes('}') && index > cronStartIndex
            ) + 1;

        for (let i = cronDocStartIndex - 1; i <= cronEndIndex; i++) {
            linesToBeRemoved.push(i);
        }

        const filteredMasterControllerLines = masterControllerLines.filter(
            (_, index) => !linesToBeRemoved.includes(index)
        );
        const masterControllerModified = filteredMasterControllerLines.join('\n');
        await fs.writeFile(masterControllerLocation, masterControllerModified);
    }

    
    /**
     * Strip cron-only code (cron error-handler branches/exports) from the shared
     * error handlers, then drop the shared logger binding if it is no longer
     * referenced. Blocks are delimited by `// start cron` ... `// end cron`.
     */
    private static async removeFromHandlers(projectLocation: string, projectType: ProjectType) {
        const targets = [
            path.join(projectLocation, 'src', 'app', 'handlers', `CustomErrorHandler.${projectType}`),
            path.join(projectLocation, 'src', 'app', 'handlers', `JoiErrorHandler.${projectType}`),
        ];

        await Promise.all(
            targets.map(async (target) => {
                const contents = await fs.readFile(target, 'utf8');
                const stripped = removeAllMarkedBlocks(contents, 'start cron', 'end cron');
                await fs.writeFile(target, pruneUnusedLogger(stripped));
            })
        );
    }

    private static async removeCronFilesAndFolders(
        projectLocation: string,
        projectType: ProjectType
    ) {
        const cronFolder = path.join(projectLocation, 'src', 'app', 'crons');
        await fs.rm(cronFolder, { recursive: true });

        const cronEnums = path.join(
            projectLocation,
            'src',
            'app',
            'enums',
            `CronJob.${projectType}`
        );
        await fs.rm(cronEnums);

        const cronBuilder = path.join(
            projectLocation,
            'src',
            'app',
            'utils',
            `CronBuilder.${projectType}`
        );
        await fs.rm(cronBuilder);
    }
}

export default SetupCron;
