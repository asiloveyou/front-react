import { setValueOnEnvironment, setValueOnLanguage } from '~/utils/common';
import { handleError } from '@utils/error';
import { ServiceType } from '~/types/common';

interface IChatCompletion {
	id: string;
	object: string;
	created: number;
	choices: IChoice[];
	usage: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
}

interface IChoice {
	index: number;
	message: {
		role: string;
		content: string;
	};
	finish_reason: string;
}

interface IChatContextItem {
	name: string;
	message: string;
}

const MAX_QUERY_COUNT = 100;
const MAX_TOKEN_COUNT = setValueOnLanguage(32, 32, 32);

const context = new Array<IChatContextItem>();

context.push({
	name: 'Helenos',
	message: `Hi there, I'm your AI friend, Helenos. What is your name?`,
});

const promptBase = `You're a person named Helenos. You're now introduced a new person. reply to person's message then add question. Make reference on the context provided below to generate life-like dialogue.`;

export async function generateAgentDialogue(friendMessage: string) {
	if (friendMessage.length === 0)
		handleError({
			message: 'OpenAI query is empty',
			origin: ServiceType.OPENAI,
		});
	if (friendMessage.length > MAX_QUERY_COUNT)
		handleError({
			message: 'OpenAI query exceeds maximum length',
			origin: ServiceType.OPENAI,
		});
	context.push({ name: 'friend', message: friendMessage });
	const previousContext = context
		.map((item) => item.name + ': ' + item.message + '.')
		.join('\n');

	const modifiedQuery =
		promptBase + '\nCONTEXT\n' + previousContext + 'Helenos: ';
	try {
		const res = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${process.env.REACT_APP_OPEN_AI_API_KEY || ''}`,
			},
			body: JSON.stringify({
				model: 'gpt-3.5-turbo',
				// model: 'gpt-4',
				messages: [{ role: 'user', content: modifiedQuery }],
				max_tokens: MAX_TOKEN_COUNT,
			}),
		});
		const data = (await res.json()) as IChatCompletion;
		const helenosMessage = data.choices[0].message.content;
		context.push({ name: 'Helenos', message: helenosMessage });
		return helenosMessage || '';
	} catch (error) {
		handleError({
			message: (error as Error).message,
			origin: ServiceType.OPENAI,
		});
		return '';
	}
}

const whisperRequestUrl = setValueOnEnvironment(
	'/openai',
	'https://api.openai.com',
	'https://api.openai.com'
);
const whisperTranscriptForm = new FormData();

whisperTranscriptForm.append('model', 'whisper-1');

interface IWhisperTranscript {
	text: string;
}

export async function getWhisperTranscript(audioFile: File) {
	const whisperPrompt = setValueOnLanguage(
		'이것은 파블로 피카소와 그림 게르니카에 대한 대화입니다. 스페인 내전 과정에서 나타난 참혹함과 그것을 표현한 게르니카에 대해 다루고 있습니다.',
		`This is a converation about the painting 'Guernica' with Pablo Picasso. It includes details about the gruesome reality of Spanish War and the artpiece 'Guernica' based on it`,
		'이것은 파블로 피카소와 그림 게르니카에 대한 대화입니다. 스페인 내전 과정에서 나타난 참혹함과 그것을 표현한 게르니카에 대해 다루고 있습니다.'
	);

	whisperTranscriptForm.delete('file');
	whisperTranscriptForm.append('file', audioFile);
	whisperTranscriptForm.delete('prompt');
	whisperTranscriptForm.append('prompt', whisperPrompt);

	try {
		const res = await fetch(`${whisperRequestUrl}/v1/audio/transcriptions`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${process.env.REACT_APP_OPEN_AI_API_KEY || ''}`,
			},
			body: whisperTranscriptForm,
		});
		const reader = res.body?.getReader();
		const uint8res = (await reader?.read())?.value || new Uint8Array();
		const result = new TextDecoder().decode(uint8res);
		return (JSON.parse(result) as IWhisperTranscript).text || '';
	} catch (error) {
		handleError({
			message: (error as Error).message,
			origin: ServiceType.OPENAI,
		});
		return '';
	}
}
