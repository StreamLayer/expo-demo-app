import React, { useState, useEffect, useRef, ReactElement } from 'react';
import {
    StyleSheet,
    View,
    ScrollView,
    Dimensions,
    Text,
    Image,
    Pressable,
    Platform,
    TouchableOpacity,
} from 'react-native';
import { 
    StreamLayer, 
    StreamLayerView, 
    StreamLayerViewPlayer, 
    StreamLayerViewOverlayLandscapeMode, 
    StreamLayerViewConfiguration, 
    StreamLayerViewNotificationFeature, 
    StreamLayerDemoEvent, 
    StreamLayerTheme 
} from 'react-native-streamlayer';
import { 
    PlayerConfiguration, 
    SourceDescription, 
    PlayerEventType, 
    THEOplayer, 
    THEOplayerView 
} from 'react-native-theoplayer';
import { UiContainer, 
    CenteredControlBar, 
    SkipButton, 
    PlayButton, 
    DEFAULT_THEOPLAYER_THEME 
} from '@theoplayer/react-native-ui';
import {
    SafeAreaView,
    useSafeAreaInsets,
  } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import branch from 'react-native-branch';

const Width = Dimensions.get('screen').width;
const Height = Dimensions.get('screen').height;

class LBarState {
    slideX: number;
    slideY: number;

    constructor(slideX: number, slideY: number) {
        this.slideX = slideX
        this.slideY = slideY
    }
}

export default function open(): React.JSX.Element {

    const [volumeBeforeDucking, setVolumeBeforeDucking] = useState<number | undefined>(undefined)
    const [isPortrait, setPortrait] = useState<boolean>();
    const [player, setPlayer] = useState<THEOplayer | undefined>(undefined);
    const [lbarState, setLbarState] = useState(new LBarState(0, 0));
    const [events, setEvents] = useState<Array<StreamLayerDemoEvent>>()
    const [currentEventId, setCurrentEventId] = useState<String>()
    const [isInitialized, setInitialized] = useState(false);
    const viewRef = useRef<StreamLayerView>(null);

    useEffect(() => {
        
        setPortrait(isScreenPortrait())
        const initialize = async () => {

            await ScreenOrientation.unlockAsync();
            try {
                checkInitialized();
            } catch (error) {
                console.error("Error initializing:", error);
            }
        };

        initialize();

        branch.subscribe(
            ({ error, params, uri }) => {

                if (error) {
                    console.error('Error from Branch: ' + error);
                    return;
                }
            
                if (params['+clicked_branch_link']) {
                    console.log('Branch params:', params.streamlayer);
                    if(Platform.OS === 'ios') {
                        StreamLayer.handleDeepLink({streamlayer: params.streamlayer})
                    } else if (Platform.OS === 'android') {
                        processBranchLink(params)
                    }
                }
            }   
        );

    }, []);

    const insets = useSafeAreaInsets()

    useEffect(() => {
        const subscription = Dimensions.addEventListener('change', ({ window, screen }) => {
            setPortrait(window.height > window.width)
        });

    
        return () => subscription?.remove()
    });

    const processBranchLink = async (params: BranchParams) => {
        try {
          const invite = await StreamLayer.getInvite(params);

          viewRef.current?.handleInvite(invite)

          if (invite !== undefined && invite !== null) {
            checkAuth(() => {
              if (navigationRef.isReady()) {
                navigationRef.navigate('Player', { hocMode: false, invite: invite });
              }
            })
          }
        } catch (e) {
          console.error(`Error: ${JSON.stringify(e)}`);
        }
      };

    const playerConfig: PlayerConfiguration = {
        license: undefined,
    };

    const source: SourceDescription = {
        sources: [
            {
                src: "https://cdn.theoplayer.com/video/elephants-dream/playlist-single-audio.m3u8",
                type: "application/x-mpegurl"
            },
        ],
    };

    const onReady = (player: THEOplayer) => {
        setPlayer(player);
        player.autoplay = true
        player.source = source;
        player.addEventListener(PlayerEventType.ERROR, console.log);
    }


    const checkInitialized = async () => {
        try {
                await StreamLayer.initSdk({
                    isLoggingEnabled: true,
                    theme: StreamLayerTheme.Green
                  },false)
                checkAuth()
                loadDemoEvents()
                const inited = await StreamLayer.isInitialized()
                setInitialized(inited)

        } catch (e) {
            console.error(e);
        }
    }

    const loadDemoEvents = async () => {
        try {
            // TODO: probably move date to SL config page later
            const events = await StreamLayer.getDemoEvents("2022-01-01")
            setEvents(events)
            if (events !== undefined && events !== null && events.length > 0) {
                createEventSession(events[0].id)
            }
        } catch (e) {
            console.error("PlayerScreen loadDemoEvents error", e);
        }
    }

    const checkAuth = async () => {
        try {
            const isUserAuthorized = await StreamLayer.isUserAuthorized()
            if (!isUserAuthorized) {
                await StreamLayer.useAnonymousAuth();
            }
        } catch (e) {
            console.error(e);
        }
    }

    // TODO: we need to add better thread managment here - probably also in native sdk part
    // add StreamLayerDemoEvent support on demand
    const createEventSession = async (id: string) => {
        try {
            await StreamLayer.createEventSession(id);
            console.log(`Created a new event with id ${id}`);
            setCurrentEventId(id)
        } catch (e) {
            console.error(e);
        }
    };

    const playerHeight = isScreenPortrait() ? 300 : Dimensions.get('screen').height;

    const onRequestStream = (id: string) => {
        console.log("onRequestStream id=" + id)
        createEventSession(id)
    }

    const onLBarStateChanged = (slideX: number, slideY: number) => {
        setLbarState(new LBarState(slideX, slideY));
    }

    const onRequestAudioDucking = (level: number) => {
        console.log("onRequestAudioDucking level=" + level)
    }

    const onDisableAudioDucking = () => {
        console.log("onDisableAudioDucking")
    }

    const streamLayerViewPlayer: StreamLayerViewPlayer = {

        get volume() {
            return 0.0
        },

        set volume(value) {

        },

    }

    const viewConfig = getViewConfig()

    var scrollItems = new Array<ReactElement>();
    if (events !== undefined && isPortrait) {
        events.forEach((event) => {
            scrollItems.push(
                <Pressable key={event.id} onPress={() => createEventSession(event.id)}>
                    <View style={styles.eventRow}>
                        {event.previewUrl !== undefined && (
                            <Image source={{ uri: event.previewUrl }}
                                style={styles.eventRowImage} />
                        )}
                        <Text style={styles.eventRowTitle} numberOfLines={1} ellipsizeMode='tail'>{event.title}</Text>
                    </View>
                </Pressable>
            )
        })
    }

    var currentEvent: StreamLayerDemoEvent | undefined;
    if (events !== undefined && currentEventId !== undefined) {
        currentEvent = events.find((event) => {
            return event.id == currentEventId
        })
    }

    console.log("Render new state playerHeight=" + playerHeight + " slideX="
        + lbarState.slideX + " slideY=" + lbarState.slideY
        + " currentEventId=" + currentEventId + " currentEvent=" + currentEvent
    )
    
    return (
        <SafeAreaView style={{...styles.container, marginTop: insets.top }}  edges={['top']}>
            {(isPortrait) &&
                <View style={{ flex: 1, marginTop: playerHeight  - insets.top }}>
                    {currentEvent !== undefined && (
                        <Text style={styles.eventTitle}>{currentEvent.title}</Text>
                    )}
                    <ScrollView style={{ flex: 1 }}>
                        {scrollItems}
                    </ScrollView>
                </View>
            }
            
            {isInitialized && 
                <StreamLayerView
                    style={isPortrait ? {...styles.portrait, height: Dimensions.get('screen').height - insets.top, width: Dimensions.get('screen').width } : styles.landscape}
                    ref={viewRef}
                    config={viewConfig}
                    applyWindowInsets={false}
                    onRequestStream={onRequestStream}
                    onLBarStateChanged={onLBarStateChanged}
                    onRequestAudioDucking={onRequestAudioDucking}
                    onDisableAudioDucking={onDisableAudioDucking}
                    player={streamLayerViewPlayer}
                    playerView={
                        <THEOplayerView config={playerConfig} onPlayerReady={onReady}
                            style={{
                                width: Dimensions.get('screen').width - lbarState.slideX,
                                height: playerHeight-lbarState.slideY,
                                paddingTop: 0,
                            }}>
                            {player !== undefined && (
                                <UiContainer
                                    theme={DEFAULT_THEOPLAYER_THEME}
                                    player={player}
                                    center={
                                        <CenteredControlBar
                                            left={<SkipButton skip={-10} />}
                                            middle={<PlayButton />}
                                            right={<SkipButton skip={10} />}
                                        />
                                    }
                                />
                            )}
                        </THEOplayerView>
                    }
                />
            }

        </SafeAreaView>
    )
}

function getViewConfig(): StreamLayerViewConfiguration {
    return {
        viewNotificationFeatures: new Array(
            StreamLayerViewNotificationFeature.Games,
            StreamLayerViewNotificationFeature.Chat,
            StreamLayerViewNotificationFeature.WatchParty,
            StreamLayerViewNotificationFeature.Twitter
        ),
        isGamesPointsEnabled: true,
        isGamesPointsStartSide: false,
        isLaunchButtonEnabled: true,
        isMenuAlwaysOpened: false,
        isMenuLabelsVisible: true,
        isMenuProfileEnabled: true,
        isTooltipsEnabled: true,
        isWatchPartyReturnButtonEnabled: true,
        isWhoIsWatchingViewEnabled: true,
        isOverlayExpandable: true,
        overlayHeightSpace: 300,
        overlayWidth: 0,
        overlayLandscapeMode: StreamLayerViewOverlayLandscapeMode.Start
    }
}

function isScreenPortrait(): boolean {
    return Dimensions.get('window').height > Dimensions.get('window').width
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'gray',
    },
    eventTitle: {
        color: 'white',
        fontSize: 24,
        margin: 4
    },
    eventRowTitle: {
        flex: 1,
        color: 'white',
        fontSize: 16,
        margin: 4
    },
    eventRow: {
        flexDirection: 'row',
        margin: 4,
        padding: 4,
        height: 58,
        justifyContent: 'flex-start',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'black',
    },
    eventRowImage: {
        width: 100,
        height: 50
    },
    overlay: {
        paddingTop: 500,
        backgroundColor: '#00000000',
        flex: 1,
    },
    portrait: {
        height: Dimensions.get('screen').height,
        width: Dimensions.get('screen').width,
        position: 'absolute'
    },
    landscape: {
        flex: 1
    },
});