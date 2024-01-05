import { initPrompts } from "./src/prompts";

const main = async () => {
    const projectConfig = await initPrompts();

    console.log(projectConfig);
}

main().then(() => {
    process.exit(0);
}).catch((err) => {
    console.error(err);
    process.exit(1);
})
