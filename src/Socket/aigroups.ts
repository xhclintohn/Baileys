import type { GroupMetadata, GroupParticipant, SocketConfig } from '../Types'
import { WAMessageAddressingMode } from '../Types'
import { generateMessageIDV2 } from '../Utils'
import {
        type BinaryNode,
        getBinaryNodeChild,
        getBinaryNodeChildren,
        getBinaryNodeChildString,
        isLidUser,
        isPnUser,
        jidEncode,
        jidNormalizedUser
} from '../WABinary'
import { makeCommunitiesSocket } from './communities'

export const makeAIGroupsSocket = (config: SocketConfig) => {
        const sock = makeCommunitiesSocket(config)
        const { ev, query } = sock

        const aiGroupQuery = async (jid: string, type: 'get' | 'set', content: BinaryNode[]) =>
                query({
                        tag: 'iq',
                        attrs: {
                                type,
                                xmlns: 'w:g2',
                                to: jid
                        },
                        content
                })

        const aiGroupMetadata = async (jid: string) => {
                const result = await aiGroupQuery(jid, 'get', [{ tag: 'query', attrs: { request: 'interactive' } }])
                return extractAIGroupMetadata(result)
        }

        sock.ws.on('CB:notification,w:gp2', async (node: any) => {
                const { attrs, content } = node
                if (!Array.isArray(content) || content.length === 0) return

                const inner = content[0]
                const tag = inner.tag
                const groupId =
                        typeof attrs.from === 'string'
                                ? attrs.from
                                : attrs.from?.$1?.user
                                ? jidEncode(attrs.from.$1.user, 'g.us')
                                : undefined

                if (!groupId) return

                if (tag === 'create') {
                        try {
                                const meta = await aiGroupMetadata(groupId)
                                ev.emit('groups.upsert', [meta])
                        } catch {
                                ev.emit('groups.upsert', [{ id: groupId } as GroupMetadata])
                        }
                } else if (tag === 'promote' || tag === 'demote' || tag === 'remove' || tag === 'add') {
                        const participants = getBinaryNodeChildren(inner, 'participant')
                                .map((p: BinaryNode) => {
                                        const jid = p.attrs.jid
                                        if (typeof jid === 'string') return jid
                                        if ((jid as any)?.$1) {
                                                return jidEncode((jid as any).$1.user, (jid as any).$1.server || 's.whatsapp.net')
                                        }
                                        return undefined
                                })
                                .filter((j): j is string => typeof j === 'string')

                        ev.emit('group-participants.update', {
                                id: groupId,
                                author: '',
                                participants: participants as any,
                                action: tag
                        })
                } else if (tag === 'subject') {
                        ev.emit('groups.update', [{ id: groupId, subject: inner.attrs?.subject }])
                }
        })

        return {
                ...sock,
                aiGroupMetadata,
                aiGroupCreate: async (subject: string, participants: string[] = [], options: Record<string, any> = {}) => {
                        if (!Array.isArray(participants)) participants = []
                        const key = generateMessageIDV2()
                        const {
                                ephemeralExpiration = 86400,
                                memberAddMode = 'all_member_add',
                                memberShareGroupHistoryMode = 'all_member_share',
                                memberLinkMode = 'all_member_link'
                        } = options
                        const result = await aiGroupQuery('@g.us', 'set', [
                                {
                                        tag: 'create',
                                        attrs: { subject, key },
                                        content: participants.map(jid => ({
                                                tag: 'participant',
                                                attrs: { jid }
                                        }))
                                },
                                {
                                        tag: 'linked_parent',
                                        attrs: {},
                                        content: [
                                                {
                                                        tag: 'ephemeral',
                                                        attrs: { expiration: ephemeralExpiration.toString() }
                                                },
                                                {
                                                        tag: 'member_add_mode',
                                                        attrs: {},
                                                        content: Buffer.from(memberAddMode, 'utf-8')
                                                },
                                                {
                                                        tag: 'member_share_group_history_mode',
                                                        attrs: {},
                                                        content: Buffer.from(memberShareGroupHistoryMode, 'utf-8')
                                                },
                                                {
                                                        tag: 'member_link_mode',
                                                        attrs: {},
                                                        content: Buffer.from(memberLinkMode, 'utf-8')
                                                }
                                        ]
                                }
                        ] as BinaryNode[])
                        return extractAIGroupMetadata(result)
                },
                aiGroupAddBot: async (jid: string, botUser = '867051314767696') => {
                        const result = await aiGroupQuery(jid, 'set', [
                                {
                                        tag: 'add',
                                        attrs: {},
                                        content: [
                                                {
                                                        tag: 'participant',
                                                        attrs: { jid: `${botUser}@bot` }
                                                }
                                        ]
                                }
                        ] as BinaryNode[])
                        const node = getBinaryNodeChild(result, 'add')
                        const participantsAffected = getBinaryNodeChildren(node!, 'participant')
                        return participantsAffected.map(p => ({
                                status: p.attrs.error || '200',
                                jid: p.attrs.jid
                        }))
                },
                aiGroupLeave: async (id: string) => {
                        await aiGroupQuery('@g.us', 'set', [
                                {
                                        tag: 'leave',
                                        attrs: {},
                                        content: [{ tag: 'group', attrs: { id } }]
                                }
                        ] as BinaryNode[])
                },
                aiGroupParticipantsUpdate: async (jid: string, participants: string[], action: string) => {
                        const result = await aiGroupQuery(jid, 'set', [
                                {
                                        tag: action,
                                        attrs: {},
                                        content: participants.map(jid => ({
                                                tag: 'participant',
                                                attrs: { jid }
                                        }))
                                }
                        ] as BinaryNode[])
                        const node = getBinaryNodeChild(result, action)
                        const participantsAffected = getBinaryNodeChildren(node!, 'participant')
                        return participantsAffected.map(p => ({
                                status: p.attrs.error || '200',
                                jid: p.attrs.jid,
                                content: p
                        }))
                },
                aiGroupUpdateSubject: async (jid: string, subject: string) => {
                        await aiGroupQuery(jid, 'set', [
                                {
                                        tag: 'subject',
                                        attrs: {},
                                        content: Buffer.from(subject, 'utf-8') as any
                                }
                        ] as BinaryNode[])
                },
                aiGroupInviteCode: async (jid: string) => {
                        const result = await aiGroupQuery(jid, 'get', [{ tag: 'invite', attrs: {} }] as BinaryNode[])
                        const inviteNode = getBinaryNodeChild(result, 'invite')
                        return inviteNode?.attrs.code
                },
                aiGroupRevokeInvite: async (jid: string) => {
                        const result = await aiGroupQuery(jid, 'set', [{ tag: 'invite', attrs: {} }] as BinaryNode[])
                        const inviteNode = getBinaryNodeChild(result, 'invite')
                        return inviteNode?.attrs.code
                },
                aiGroupAcceptInvite: async (code: string) => {
                        const results = await aiGroupQuery('@g.us', 'set', [
                                { tag: 'invite', attrs: { code } }
                        ] as BinaryNode[])
                        const result = getBinaryNodeChild(results, 'group')
                        return result?.attrs.jid
                },
                aiGroupSettingUpdate: async (jid: string, setting: string) => {
                        await aiGroupQuery(jid, 'set', [{ tag: setting, attrs: {} }] as BinaryNode[])
                },
                aiGroupToggleEphemeral: async (jid: string, ephemeralExpiration?: number) => {
                        const content = ephemeralExpiration
                                ? { tag: 'ephemeral', attrs: { expiration: ephemeralExpiration.toString() } }
                                : { tag: 'not_ephemeral', attrs: {} }
                        await aiGroupQuery(jid, 'set', [content] as BinaryNode[])
                }
        }
}

export const extractAIGroupMetadata = (result: any): GroupMetadata => {
        const createNode = getBinaryNodeChild(result, 'create')
        const group =
                getBinaryNodeChild(createNode || result, 'group') ||
                getBinaryNodeChild(result, 'group')!
        const descChild = getBinaryNodeChild(group, 'description')
        let desc: string | undefined
        let descId: string | undefined
        let descOwner: string | undefined
        let descOwnerPn: string | undefined
        let descTime: number | undefined
        if (descChild) {
                desc = getBinaryNodeChildString(descChild, 'body')
                descOwner = descChild.attrs.participant ? jidNormalizedUser(descChild.attrs.participant) : undefined
                descOwnerPn = descChild.attrs.participant_pn
                        ? jidNormalizedUser(descChild.attrs.participant_pn)
                        : undefined
                descTime = +(descChild.attrs.t ?? 0)
                descId = descChild.attrs.id
        }
        const rawId = group.attrs.id ?? ''
        const groupId = rawId.includes('@') ? rawId : jidEncode(rawId, 'g.us')
        const eph = getBinaryNodeChild(group, 'ephemeral')?.attrs.expiration
        return {
                id: groupId,
                subject: group.attrs.subject ?? '',
                subjectTime: +(group.attrs.s_t ?? 0),
                creation: +(group.attrs.creation ?? 0),
                owner: group.attrs.creator ? jidNormalizedUser(group.attrs.creator) : undefined,
                size: group.attrs.size
                        ? +group.attrs.size
                        : getBinaryNodeChildren(group, 'participant').length,
                desc,
                descId,
                descOwner,
                descOwnerPn,
                descTime: descTime ?? 0,
                addressingMode:
                        group.attrs.addressing_mode === 'lid'
                                ? WAMessageAddressingMode.LID
                                : WAMessageAddressingMode.PN,
                participants: getBinaryNodeChildren(group, 'participant').map(({ attrs }) => ({
                        id: attrs.jid ?? '',
                        phoneNumber:
                                isLidUser(attrs.jid ?? '') && isPnUser(attrs.phone_number ?? '')
                                        ? attrs.phone_number
                                        : undefined,
                        lid:
                                isPnUser(attrs.jid ?? '') && isLidUser(attrs.lid ?? '') ? attrs.lid : undefined,
                        admin: (attrs.type || null) as GroupParticipant['admin']
                })),
                ephemeralDuration: eph ? +eph : undefined
        }
}
