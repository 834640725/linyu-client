import "./index.less"
import CustomSearchInput from "../../../componets/CustomSearchInput/index.jsx";
import {useEffect, useRef, useState} from "react";
import RightClickMenu from "../../../componets/RightClickMenu/index.jsx";
import CommonChatFrame from "../../../componets/CommonChatFrame/index.jsx";
import CreateChatWindow from "../../ChatWindow/window.jsx";
import CustomDragDiv from "../../../componets/CustomDragDiv/index.jsx";
import ChatListApi from "../../../api/chatList.js";
import {useDispatch, useSelector} from "react-redux";
import {addChatWindowUser, deleteChatWindowUser, setCurrentChatId} from "../../../store/chat/action.js";
import {listen} from "@tauri-apps/api/event";
import {formatChatTime} from "../../../utils/date.js";
import FriendApi from "../../../api/friend.js";
import {useHistory} from "react-router-dom";
import FriendSearchCard from "../../../componets/FriendSearchCard/index.jsx";

export default function Chat() {
    const chatStoreData = useSelector((state) => state.chatData);
    const [selectedChatId, setSelectedChatId] = useState(chatStoreData.currentChatId)
    const currentToId = useRef(chatStoreData.currentChatId)//消息目标用户
    const [selectedUserInfo, setSelectedUserInfo] = useState(chatStoreData.currentChatUserInfo);
    const selectedRightUserInfo = useRef(null);
    const rightSelected = useRef(null);
    const [menuPosition, setMenuPosition] = useState(null);
    const [topChatsData, setTopChatsData] = useState([])
    const [allChatsData, setAllChatsData] = useState([])
    const dispatch = useDispatch();
    const chatWindowUsersRef = useRef(chatStoreData.chatWindowUsers);
    let h = useHistory();

    //搜索
    const [searchInfo, setSearchInfo] = useState("")
    const [searchFriendsList, setSearchFriendsList] = useState([])

    const onGetChatList = () => {
        ChatListApi.list().then(res => {
            if (res.code === 0) {
                setTopChatsData(res.data.tops)
                setAllChatsData(res.data.others)
            }
        })
    }

    useEffect(() => {
        //监听后端接受到的消息
        const unReceiveListen = listen('on-receive-msg', (event) => {
            let data = event.payload
            if (currentToId.current === data.fromId) {
                ChatListApi.read(data.fromId).then(() => {
                    onGetChatList()
                })
            } else {
                onGetChatList()
            }
        });
        //监听前端接受到的消息
        const unSendListen = listen('on-send-msg', (event) => {
            onGetChatList()
        });
        //监听聊天窗口是否销毁
        const unChatDestroyed = listen('chat-destroyed', (event) => {
            let storeUserInfo = chatWindowUsersRef.current.get(event.payload.fromId);
            if (currentToId.current === storeUserInfo.fromId) {
                setSelectedUserInfo(storeUserInfo)
            }
            dispatch(deleteChatWindowUser(event.payload.fromId))
        })
        return async () => {
            (await unReceiveListen)();
            (await unSendListen)();
            (await unChatDestroyed)();
        }
    }, [])

    useEffect(() => {
        chatWindowUsersRef.current = chatStoreData.chatWindowUsers
    }, [chatStoreData.chatWindowUsers])

    useEffect(() => {
        setSelectedChatId(chatStoreData.currentChatId)
    }, [chatStoreData.currentChatId])


    useEffect(() => {
        currentToId.current = selectedChatId
    }, [selectedChatId])

    useEffect(() => {
        onGetChatList()
    }, []);

    const chatListRightOptions = [
        {key: "top", label: "置顶"},
        {key: "unTop", label: "取消置顶"},
        {key: "unNoDisturb", label: "设置免打扰"},
        {key: "unNoDisturb ", label: "取消免打扰"},
        {key: "newChatWindow", label: "打开独立窗口"},
        {key: "deleteChat", label: "从聊天列表中移除"},
    ]

    const onMenuItemClick = (item) => {
        switch (item.key) {
            case "newChatWindow" : {
                dispatch(addChatWindowUser(selectedRightUserInfo.current))
                let title = selectedRightUserInfo.current.remark ? selectedRightUserInfo.current.remark : selectedRightUserInfo.current.name
                CreateChatWindow(rightSelected.current, title ? title : "linyu")
                if (selectedChatId === rightSelected.current) {
                    setSelectedUserInfo(null)
                }
            }
        }
    }

    useEffect(() => {
        if (searchInfo) {
            FriendApi.search({friendInfo: searchInfo}).then(res => {
                if (res.code === 0) {
                    setSearchFriendsList(res.data)
                }
            })
        }
    }, [searchInfo])

    const onChatListClick = (data) => {
        setSelectedChatId(data.fromId)
        let storeUserInfo = chatStoreData.chatWindowUsers.get(data.fromId);
        if (storeUserInfo) {
            setSelectedUserInfo(null)
            CreateChatWindow(storeUserInfo.fromId, "linyu")
            return
        }
        if (selectedChatId === data.fromId)
            return
        dispatch(setCurrentChatId(data.fromId, data))
        setSelectedUserInfo(data)
        ChatListApi.read(data.fromId).then(res => {
            onGetChatList()
        })
    }

    const ChatCard = ({info, onClick, onContextMenu}) => {
        let isSelected = false
        if (info.fromId === selectedChatId) {
            isSelected = true
        }
        return (
            <div
                className={`chat-card ${isSelected ? "selected" : ""}`}
                onClick={() => onClick(info)}
                onContextMenu={(e) => {
                    e.preventDefault()
                    if (onContextMenu) onContextMenu(e)
                }}
            >
                <img className="chat-card-portrait" src={info.portrait}
                     alt={info.portrait}/>
                <div className="chat-card-content">
                    <div className="chat-card-content-item">
                        <div
                            style={{
                                fontSize: 14,
                                fontWeight: 600,
                                color: `${isSelected ? "#FFF" : "1F1F1F"}`
                            }}
                            className="ellipsis"
                        >
                            {info.remark ? info.remark : info.name}
                        </div>
                        <div style={{
                            fontSize: 10,
                            color: `${isSelected ? "#F6F6F6" : "#646464"}`
                        }}>{formatChatTime(info.updateTime)}</div>
                    </div>
                    <div className="chat-card-content-item">
                        <div
                            style={{fontSize: 12, color: `${isSelected ? "#F6F6F6" : "#646464"}`}}
                            className="ellipsis"
                        >
                            {info.lastMsgContent?.content}
                        </div>
                        {
                            info.unreadNum > 0 && !isSelected ? <div style={{
                                    width: 18,
                                    minWidth: 18,
                                    height: 18,
                                    borderRadius: 16,
                                    backgroundColor: "#4C9BFF",
                                    fontSize: 12,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#fff"
                                }}>
                                    {info.unreadNum < 99 ? info.unreadNum : "99+"}
                                </div> :
                                <></>
                        }
                    </div>
                </div>
            </div>
        )
    }

    const onSendMsgClick = (friendId) => {
        setSearchInfo("")
        ChatListApi.create({userId: friendId}).then(res => {
            if (res.code === 0) {
                dispatch(setCurrentChatId(friendId, res.data))
                setSelectedUserInfo(res.data)
            }
        })
    }

    return (
        <div className="chat">
            <div className="chat-list">
                <CustomDragDiv className="chat-list-top">
                    <label className="chat-list-top-title">聊天列表</label>
                    <div>
                        <CustomSearchInput
                            value={searchInfo}
                            onChange={(v) => setSearchInfo(v)}
                        />
                    </div>
                </CustomDragDiv>
                <RightClickMenu
                    position={menuPosition}
                    options={chatListRightOptions}
                    onMenuItemClick={onMenuItemClick}
                />
                {!searchInfo ?
                    <div
                        className="chat-list-items">
                        {topChatsData?.length > 0 && <div className="chat-list-items-label">置顶</div>}
                        {
                            topChatsData.map(data => {
                                return (
                                    <ChatCard
                                        key={data.id}
                                        onContextMenu={(e) => {
                                            rightSelected.current = data.fromId;
                                            selectedRightUserInfo.current = data;
                                            setMenuPosition({x: e.clientX, y: e.clientY})
                                        }}
                                        info={data}
                                        onClick={() => onChatListClick(data)}
                                    />
                                )
                            })
                        }
                        <div className="chat-list-items-label">全部</div>
                        {
                            allChatsData.map(data => {
                                return (
                                    <ChatCard
                                        key={data.id}
                                        onContextMenu={(e) => {
                                            rightSelected.current = data.fromId;
                                            selectedRightUserInfo.current = data;
                                            setMenuPosition({x: e.clientX, y: e.clientY})
                                        }}
                                        info={data}
                                        onClick={() => onChatListClick(data)}
                                    />
                                )
                            })
                        }
                    </div>
                    : <div className="chat-list-items">
                        {searchFriendsList.length > 0 ?
                            <div>
                                {
                                    searchFriendsList.map((friend) => {
                                        return (
                                            <FriendSearchCard
                                                info={friend}
                                                onClick={() => onSendMsgClick(friend.friendId)}
                                            />
                                        )
                                    })
                                }
                            </div>
                            : <div style={{
                                width: "100%",
                                height: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexDirection: "column",
                            }}>
                                <img style={{width: 130, height: 80}} src="/empty.svg" alt="empty"/>
                                <div style={{fontSize: 14, marginBottom: 200}}>搜索结果为空~</div>
                            </div>
                        }
                    </div>
                }
            </div>
            {
                selectedUserInfo ?
                    <CommonChatFrame userInfo={selectedUserInfo}/>
                    :
                    <CustomDragDiv style={{display: "flex", flex: 1, alignItems: "center", justifyContent: "center"}}>
                        <img style={{height: 120}} src="/bg.png" alt=""/>
                    </CustomDragDiv>
            }
        </div>
    )
}