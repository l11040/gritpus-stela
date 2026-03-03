import Anthropic from '@anthropic-ai/sdk';
import * as readline from 'node:readline';

const client = new Anthropic();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer));
  });
}

const conversationHistory: Anthropic.MessageParam[] = [];

async function chat(userMessage: string): Promise<string> {
  conversationHistory.push({ role: 'user', content: userMessage });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    system: 'You are a helpful assistant for the Gritpus Stela project.',
    messages: conversationHistory,
  });

  const assistantMessage =
    response.content[0].type === 'text' ? response.content[0].text : '';

  conversationHistory.push({ role: 'assistant', content: assistantMessage });
  return assistantMessage;
}

async function main() {
  console.log('Gritpus Stela Desktop CLI');
  console.log('Type "exit" to quit.\n');

  if (process.argv.length > 2) {
    // stdin pipe mode: read all stdin and output response
    const chunks: Buffer[] = [];
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', async () => {
      const input = Buffer.concat(chunks).toString('utf-8').trim();
      if (input) {
        const response = await chat(input);
        process.stdout.write(response);
      }
      process.exit(0);
    });
    return;
  }

  // Interactive mode
  while (true) {
    const input = await prompt('You: ');
    if (input.toLowerCase() === 'exit') {
      console.log('Bye!');
      rl.close();
      break;
    }
    if (!input.trim()) continue;

    const response = await chat(input);
    console.log(`\nAssistant: ${response}\n`);
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
