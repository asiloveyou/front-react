import React, { useState, useEffect } from 'react';
import { Container, Viewport } from '@components/common';
import {
	AgentContainer,
	MessageContainer,
	ButtonContainer,
	ToolbarContainer,
	Divider,
} from './style';
import {
	AgentCanvas,
	PlayButton,
	UserMessage,
	KeyboardButton,
	AgentMessage,
	Toolbar,
	KeyboardInputModal,
	MuteButton,
} from '@components/interact';

import useAudioStream from '@hooks/useAudioStream';
import useGoogleRecognition from '@hooks/useGoogleRecognition';
import useLocalRecognition from '~/hooks/useLocalRecognition';
import { stopAudio, toggleSystemStatusOnVolume } from '@utils/audio';
import { SystemStatus } from '~/types/common';
import { isChrome, isSafari } from '@utils/common';
import { answerUserDialogue } from '@utils/dialogue';
import {
	useAppDispatch,
	useAppSelector,
	setDialogueState,
} from '@states/store';

const clickSound = new Audio('/sound/toggle.mp3');

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
	const [showInputPopup, setShowInputPopup] = useState<boolean>(false);
	const [isMute, setIsMute] = useState<boolean>(true);
	const systemStatus = useAppSelector((state) => state.dialogue.status);
	const dispatch = useAppDispatch();
	const { volume: voiceVolume, stream: voiceStream } = useAudioStream();

	const { transcript } = useRecognition()({ stream: voiceStream });

	function handleKeyboardSubmit(text: string) {
		setUserMessage(text);
		dispatch(setDialogueState(SystemStatus.GENERATE));
	}

	const handlePlayButton = () => {
		void clickSound.play();
		if (systemStatus === SystemStatus.PAUSE) {
			dispatch(setDialogueState(SystemStatus.READY));
		} else {
			dispatch(setDialogueState(SystemStatus.PAUSE));
			setUserMessage('');
			stopAudio();
		}
	};

	useEffect(() => {
		if (transcript.length === 0) return;
		setUserMessage(transcript);
	}, [transcript]);

	useEffect(() => {
		console.log(userMessage, systemStatus);
		if (systemStatus === SystemStatus.GENERATE)
			void answerUserDialogue(userMessage, setAgentMessage);
		// if ([SystemStatus.WAIT].includes(systemStatus)) setUserMessage('');
	}, [systemStatus, userMessage]);

	useEffect(() => {
		toggleSystemStatusOnVolume({
			isMute,
			voiceVolume,
		});
	}, [voiceVolume]);

	return (
		<Container>
			<Viewport>
				<KeyboardInputModal
					showInputPopup={showInputPopup}
					setShowInputPopup={setShowInputPopup}
					handleKeyboardSubmit={handleKeyboardSubmit}
				/>
				<ToolbarContainer>
					<Toolbar />
				</ToolbarContainer>
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
					<MuteButton
						isMute={isMute}
						setIsMute={setIsMute}
						volume={voiceVolume}
					/>
					<PlayButton
						systemStatus={systemStatus}
						handlePlayButton={handlePlayButton}
					/>
					<KeyboardButton
						handleKeyboardButton={() => {
							if (
								[SystemStatus.READY, SystemStatus.WAIT].includes(systemStatus)
							)
								setShowInputPopup(true);
						}}
					/>
				</ButtonContainer>
			</Viewport>
		</Container>
	);
}

export default Interact;
