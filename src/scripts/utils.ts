import shell from 'shelljs';

export const getLatestVersion = async (packageName: string): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
        const child = shell.exec(`npm view ${packageName} version`, { silent: true, async: true });
        let output = '';
        child.stdout?.on('data', (data) => {
            output += data;
        });
        child.on('close', () => {
            resolve(output.trim());
        });
        child.on('error', reject);
    });
};
