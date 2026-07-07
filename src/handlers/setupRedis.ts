import fs from 'fs/promises';
import path from 'node:path';
import { ProjectType } from '../prompts/enums';

class SetupRedis {
    public static async init(projectLocation: string, redis: boolean, projectType: ProjectType) {
        if (redis) return;

        await this.dependencies(projectLocation);
        await this.deleteRedisFiles(projectLocation, projectType);
        await this.removeFromServer(projectLocation, projectType);
        await this.removeFromEnv(projectLocation);
    }

    private static async dependencies(projectLocation: string) {
        const packageJsonLocation = path.join(projectLocation, 'package.json');
        const packageJson = JSON.parse(await fs.readFile(packageJsonLocation, 'utf8'));

        delete packageJson.dependencies.ioredis;

        await fs.writeFile(packageJsonLocation, JSON.stringify(packageJson, null, 2));
    }

    private static async deleteRedisFiles(projectLocation: string, projectType: ProjectType) {
        const filesAndFolders = [
            path.join(projectLocation, 'src', 'config', `redisConfig.${projectType}`),
            path.join(projectLocation, 'src', 'app', 'common', `redis.client.${projectType}`),
        ];

        await Promise.allSettled(filesAndFolders.map((target) => fs.rm(target, { recursive: true })));
    }

    private static async removeFromServer(projectLocation: string, projectType: ProjectType) {
        const serverLocation = path.join(projectLocation, 'src', `server.${projectType}`);
        const serverContents = await fs.readFile(serverLocation, 'utf8');
        const serverLines = serverContents.split('\n');
        const linesToRemove: number[] = [];

        const removeRange = (startMarker: string, endMarker: string) => {
            const startIndex = serverLines.findIndex((line) => line.includes(startMarker));
            const endIndex = serverLines.findIndex(
                (line, index) => line.includes(endMarker) && index > startIndex
            );

            if (startIndex === -1 || endIndex === -1) return;

            for (let i = startIndex; i <= endIndex; i++) {
                linesToRemove.push(i);
            }
        };

        removeRange('start redis import', 'end redis import');
        removeRange('start redis connect', 'end redis connect');
        removeRange('start redis shutdown', 'end redis shutdown');

        const filteredServerLines = serverLines.filter((_, index) => !linesToRemove.includes(index));
        await fs.writeFile(serverLocation, filteredServerLines.join('\n'));
    }

    private static async removeFromEnv(projectLocation: string) {
        const envTargets = ['.env', '.env.sample'];

        await Promise.all(
            envTargets.map(async (envFile) => {
                const envLocation = path.join(projectLocation, envFile);
                const envContents = await fs.readFile(envLocation, 'utf8');
                const envLines = envContents.split('\n');
                const linesToRemove: number[] = [];

                const startIndex = envLines.findIndex((line) => line.includes('Redis'));
                const endIndex = envLines.findIndex(
                    (line, index) => line.includes('JWT_PRIVATE_KEY=') && index > startIndex
                );

                if (startIndex !== -1 && endIndex !== -1) {
                    for (let i = startIndex - 1; i < endIndex; i++) {
                        linesToRemove.push(i);
                    }
                }

                const filteredEnvLines = envLines.filter((_, index) => !linesToRemove.includes(index));
                await fs.writeFile(envLocation, filteredEnvLines.join('\n'));
            })
        );
    }
}

export default SetupRedis;