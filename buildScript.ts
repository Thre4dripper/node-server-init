import path from 'node:path';
import shell from 'shelljs';

const localTemplateRepo = path.resolve(process.cwd(), '..', 'NodeTs-Express-Service-Based-Template');
const remoteTemplateRepo = 'https://github.com/Thre4dripper/NodeTs-Express-Service-Based-Template';

(async () => {
    //remove dist folder
    shell.rm('-rf', 'dist')
    //build
    shell.exec('tsc')
    //make dist/index.js executable
    shell.chmod('+x', 'dist/index.js')
    //get template
    shell.cd('dist')
    if (shell.test('-d', localTemplateRepo)) {
        // Copy the local working tree directly so uncommitted edits (markers, scripts,
        // structural changes) are included. A `git clone` of a local path would only
        // copy the committed HEAD and silently miss in-progress template changes.
        shell.mkdir('-p', 'template')
        shell.cp('-R', path.join(localTemplateRepo, '*'), 'template')
        // also copy dotfiles (.env.sample, .gitignore, etc.) that the glob above skips
        shell.cp('-R', path.join(localTemplateRepo, '.[!.]*'), 'template')
    } else {
        shell.exec(`git clone "${remoteTemplateRepo}" template`)
    }
    //remove git and local-only artifacts that must never ship in the template
    shell.cd('template')
    shell.rm('-rf', '.git', 'node_modules', 'dist')

    //make two copies
    shell.cd('../')
    shell.cp('-R', 'template', 'template-ts')
    shell.cp('-R', 'template', 'template-js')

    //remove alternate src folder
    shell.cd('template-ts')
    shell.rm('-rf', 'src-javascript')
    shell.mv('src-typescript', 'src')

    // fix src folder references in tsconfig after renaming src-typescript -> src
    shell.sed('-i', './src-typescript', './src', 'tsconfig.json')

    //remove alternate src folder
    shell.cd('../template-js')
    shell.rm('-rf', 'src-typescript')
    shell.mv('src-javascript', 'src')

    //remove tsconfig from js
    shell.rm('tsconfig.json')

    //remove template folder from dist
    shell.cd('../')
    shell.rm('-rf', 'template')

    //remove template folder from root
    shell.cd('../')
    shell.rm('-rf', 'template')
})()
