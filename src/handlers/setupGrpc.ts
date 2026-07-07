import fs from 'fs/promises';
import path from 'node:path';
import { ProjectType } from '../prompts/enums';
import { removeAllMarkedBlocks } from './markerUtils';

class SetupGrpc {
    public static async init(projectLocation: string, grpc: boolean, projectType: ProjectType) {
        if (grpc) return;

        await this.dependencies(projectLocation);
        await this.scripts(projectLocation);
        await this.deleteGrpcFiles(projectLocation, projectType);
        await this.removeFromServer(projectLocation, projectType);
        await this.removeFromMasterController(projectLocation, projectType);
        await this.removeFromControllersAndHandlers(projectLocation, projectType);
        await this.removeFromEnv(projectLocation);
    }

    private static async dependencies(projectLocation: string) {
        const packageJsonLocation = path.join(projectLocation, 'package.json');
        const packageJson = JSON.parse(await fs.readFile(packageJsonLocation, 'utf8'));

        delete packageJson.dependencies['@bufbuild/protobuf'];
        delete packageJson.dependencies['@grpc/grpc-js'];
        delete packageJson.dependencies['@grpc/proto-loader'];
        delete packageJson.dependencies['@grpc/reflection'];

        delete packageJson.devDependencies['grpc-tools'];
        delete packageJson.devDependencies['ts-proto'];

        await fs.writeFile(packageJsonLocation, JSON.stringify(packageJson, null, 2));
    }

    private static async scripts(projectLocation: string) {
        const packageJsonLocation = path.join(projectLocation, 'package.json');
        const packageJsonContents = await fs.readFile(packageJsonLocation, 'utf8');
        const packageJson = JSON.parse(packageJsonContents);

        packageJson.scripts['proto:build'] = "echo 'gRPC disabled'";
        packageJson.scripts.postinstall = "echo 'gRPC disabled'";

        await fs.writeFile(packageJsonLocation, JSON.stringify(packageJson, null, 2));
    }

    private static async deleteGrpcFiles(projectLocation: string, projectType: ProjectType) {
        const filesAndFolders = [
            path.join(projectLocation, 'scripts', 'proto-gen.sh'),
            path.join(projectLocation, 'src', 'config', `grpcConfig.${projectType}`),
            path.join(projectLocation, 'src', 'app', 'common', `grpc.client.${projectType}`),
            path.join(projectLocation, 'src', 'app', 'utils', `GrpcClientFactory.${projectType}`),
            path.join(projectLocation, 'src', 'app', 'utils', `GrpcMiddleware.${projectType}`),
            path.join(
                projectLocation,
                'src',
                'app',
                'middlewares',
                `grpc.auth.middleware.${projectType}`
            ),
            path.join(
                projectLocation,
                'src',
                'app',
                'middlewares',
                `grpc.token.middleware.${projectType}`
            ),
            path.join(projectLocation, 'src', 'app', 'grpc'),
            path.join(projectLocation, 'src', 'proto'),
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

        removeRange('start grpc import', 'end grpc import');
        removeRange('start grpc client import', 'end grpc client import');
        removeRange('start grpc port', 'end grpc port');
        removeRange('start grpc bootstrap', 'end grpc bootstrap');
        removeRange('start grpc shutdown', 'end grpc shutdown');

        const filteredServerLines = serverLines.filter((_, index) => !linesToRemove.includes(index));
        await fs.writeFile(serverLocation, filteredServerLines.join('\n'));
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
        const contents = await fs.readFile(masterControllerLocation, 'utf8');
        const lines = contents.split('\n');
        const linesToRemove: number[] = [];

        const removeRange = (startMarker: string, endMarker: string) => {
            const startIndex = lines.findIndex((line) => line.includes(startMarker));
            const endIndex = lines.findIndex(
                (line, index) => line.includes(endMarker) && index > startIndex
            );

            if (startIndex === -1 || endIndex === -1) return;

            for (let i = startIndex; i <= endIndex; i++) {
                linesToRemove.push(i);
            }
        };

        removeRange('start grpc imports', 'end grpc imports');
        removeRange('start grpc controllers', 'end grpc controllers');

        const filtered = lines.filter((_, index) => !linesToRemove.includes(index));
        await fs.writeFile(masterControllerLocation, filtered.join('\n'));
    }

    /**
     * Strip gRPC-only code (imports, proto imports, gRPC controllers, gRPC error
     * handler branches/exports) from the user controllers and shared error
     * handlers. Blocks are delimited by `// start grpc` ... `// end grpc`.
     */
    private static async removeFromControllersAndHandlers(
        projectLocation: string,
        projectType: ProjectType
    ) {
        const targets = [
            path.join(
                projectLocation,
                'src',
                'app',
                'apis',
                'user',
                'controllers',
                `login.user.controller.${projectType}`
            ),
            path.join(
                projectLocation,
                'src',
                'app',
                'apis',
                'user',
                'controllers',
                `register.user.controller.${projectType}`
            ),
            path.join(projectLocation, 'src', 'app', 'handlers', `CustomErrorHandler.${projectType}`),
            path.join(projectLocation, 'src', 'app', 'handlers', `JoiErrorHandler.${projectType}`),
        ];

        await Promise.all(
            targets.map(async (target) => {
                const contents = await fs.readFile(target, 'utf8');
                const stripped = removeAllMarkedBlocks(contents, 'start grpc', 'end grpc');
                await fs.writeFile(target, stripped);
            })
        );
    }

    private static async removeFromEnv(projectLocation: string) {
        const envTargets = ['.env', '.env.sample'];

        await Promise.all(
            envTargets.map(async (envFile) => {
                const envLocation = path.join(projectLocation, envFile);
                const envContents = await fs.readFile(envLocation, 'utf8');
                const envLines = envContents.split('\n');
                const linesToRemove: number[] = [];

                const startIndex = envLines.findIndex((line) => line.includes('gRPC client examples'));
                const endIndex = envLines.findIndex(
                    (line, index) => line.includes('GRPC_UI_URL=') && index > startIndex
                );

                if (startIndex !== -1 && endIndex !== -1) {
                    for (let i = startIndex - 1; i <= endIndex; i++) {
                        linesToRemove.push(i);
                    }
                }

                const grpcPortIndex = envLines.findIndex((line) => line.startsWith('GRPC_PORT='));
                if (grpcPortIndex !== -1) {
                    linesToRemove.push(grpcPortIndex);
                }

                const filteredEnvLines = envLines.filter((_, index) => !linesToRemove.includes(index));
                await fs.writeFile(envLocation, filteredEnvLines.join('\n'));
            })
        );
    }
}

export default SetupGrpc;