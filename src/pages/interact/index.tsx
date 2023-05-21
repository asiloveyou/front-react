/* eslint-disable @typescript-eslint/ban-ts-comment */
import React, { useState, useEffect } from 'react';
import { Container, Viewport } from '@components/common';
import {
	Toolbar,
	ToolbarButton,
	AgentContainer,
	MessageContainer,
	ButtonContainer,
	Divider,
} from './style';
import {
	AgentCanvas,
	MuteButton,
	UserMessage,
	KeyboardButton,
	VolumeIndicator,
	AgentMessage,
} from '@components/interact';
import { RxTokens, RxAccessibility, RxShadow } from 'react-icons/rx';
import { requestChatCompletion } from '@api/openai';
import useAudioStream from '@hooks/useAudioStream';
import useGoogleRecognition from '@hooks/useGoogleRecognition';
import useLocalRecognition from '~/hooks/useLocalRecognition';
import {
	checkMute,
	playTextToAudio,
	stopAudio,
	toggleSystemStatusOnVolume,
} from '@utils/audio';
import { SystemStatus } from '~/types/common';
import { isChrome, isSafari } from '~/utils/common';

const dummyTitle = 'american gothics';
const clickSound = new Audio('/sound/toggle.mp3');

async function generateAnswer(question: string) {
	const res = await requestChatCompletion(question);
	const content = res?.choices[0].message.content || '';
	console.log('openai answer: ', content);
	return content;
}

async function answerQuestion(
	question: string,
	systemStatus: SystemStatus,
	setSystemState: React.Dispatch<React.SetStateAction<SystemStatus>>,
	setAgentMessage: React.Dispatch<React.SetStateAction<string>>
) {
	console.log('user question: ', question);
	if (systemStatus !== SystemStatus.GENERATE || question.length === 0) return;
	const answer = await generateAnswer(question);
	setAgentMessage(answer);
	setSystemState(checkMute(SystemStatus.SPEAK));
	await playTextToAudio(answer);
	setSystemState(checkMute(SystemStatus.HIBERNATE));
}

function useRecognition() {
	if (isChrome) return useGoogleRecognition;
	else if (isSafari) return useLocalRecognition;
	else
		return () => {
			return { transcript: 'browser not supported' };
		};
}

function Interact() {
	const [userMessage, setUserMessage] = useState<string>('');
	const [agentMessage, setAgentMessage] = useState<string>('');
	const [systemStatus, setSystemStatus] = useState<SystemStatus>(
		SystemStatus.MUTE
	);
	const { volume: voiceVolume, stream: voiceStream } = useAudioStream();

	const { transcript } = useRecognition()({
		stream: voiceStream,
		systemStatus,
		setSystemStatus,
	});

	useEffect(() => {
		console.log(transcript, systemStatus);
		if (systemStatus !== SystemStatus.SPEAK) setUserMessage(transcript);
		if (transcript.length === 0) return;
		if (systemStatus === SystemStatus.GENERATE) {
			void answerQuestion(
				transcript,
				systemStatus,
				setSystemStatus,
				setAgentMessage
			);
		}
	}, [transcript, systemStatus]);

	useEffect(() => {
		toggleSystemStatusOnVolume({
			voiceVolume,
			systemStatus,
			setSystemStatus,
		});
	}, [voiceVolume]);

	const handleMuteButton = () => {
		void clickSound.play();
		if (systemStatus === SystemStatus.MUTE) {
			setSystemStatus(SystemStatus.HIBERNATE);
		} else {
			setSystemStatus(SystemStatus.MUTE);
			stopAudio();
		}
	};

	return (
		<Container>
			<Viewport>
				<Toolbar>
					<ToolbarButton>
						<RxAccessibility />
					</ToolbarButton>
					<div>{dummyTitle}</div>
					<ToolbarButton>
						<RxTokens />
					</ToolbarButton>
				</Toolbar>
				<AgentContainer>
					<AgentMessage message={agentMessage} systemStatus={systemStatus} />
					<AgentCanvas
						systemStatus={systemStatus}
						voiceVolume={voiceVolume}
					></AgentCanvas>
				</AgentContainer>
				<Divider></Divider>
				<MessageContainer>
					<UserMessage message={userMessage} systemStatus={systemStatus} />
				</MessageContainer>
				<ButtonContainer>
					<VolumeIndicator volume={voiceVolume} systemStatus={systemStatus} />
					<MuteButton
						systemStatus={systemStatus}
						handleMuteButton={handleMuteButton}
					/>
					<KeyboardButton handleKeyboardButton={() => {}} />
				</ButtonContainer>
			</Viewport>
		</Container>
	);
}

export default Interact;
