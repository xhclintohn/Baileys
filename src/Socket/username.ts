import { randomUUID } from 'crypto'
import type { SocketConfig } from '../Types'
import { USyncQuery, USyncUser } from '../WAUSync'
import { executeWMexQuery } from './mex'
import { makeNewsletterSocket } from './newsletter'

export const USERNAME_QUERY_IDS = {
	CHECK: '26124072630599518',
	CHECK_MULTI: '27134626522840286',
	SET: '27108705368767936',
	GET: '32618050064506055',
	GET_RECOMMENDATIONS: '26077456248616957',
	PIN_SET: '25529696019976770'
}

export type UsernameQueryIds = typeof USERNAME_QUERY_IDS

export const setUsernameQueryIds = (ids: Partial<UsernameQueryIds>) => {
	Object.assign(USERNAME_QUERY_IDS, ids)
	return USERNAME_QUERY_IDS
}

export const USERNAME_CHECK_RESULT = {
	SUCCESS: 'SUCCESS',
	INVALID: 'INVALID'
} as const

export const USERNAME_SOURCE = {
	FB: 'FB',
	IG: 'IG',
	USER_INPUT: 'USER_INPUT',
	SUGGESTION: 'SUGGESTION'
} as const

export type UsernameSource = (typeof USERNAME_SOURCE)[keyof typeof USERNAME_SOURCE]

export type UsernameCheckResult = {
	available: boolean
	username: string
	session_id: string
	suggestions?: string[]
	rejectionReasons?: string[]
	suggestionsEligible?: boolean
}

export type SetUsernameOptions = {
	source?: UsernameSource
	sessionId?: string
	pin?: string
}

export const makeUsernameSocket = (config: SocketConfig) => {
	const sock = makeNewsletterSocket(config)
	const { query, generateMessageTag, executeUSyncQuery } = sock

	const mexQuery = <T>(variables: Record<string, unknown>, queryId: string, dataPath: string): Promise<T> =>
		executeWMexQuery<T>(variables, queryId, dataPath, query, generateMessageTag)

	const checkUsername = async (
		username: string,
		includeSuggestions = true,
		sessionId?: string
	): Promise<UsernameCheckResult> => {
		const session_id = sessionId || randomUUID()
		const data = await mexQuery<{
			result?: string
			suggestions?: string[]
			rejection_reasons?: string[]
			suggestions_eligible?: boolean
		}>(
			{
				username,
				include_suggestions: includeSuggestions,
				session_id,
				source: USERNAME_SOURCE.USER_INPUT
			},
			USERNAME_QUERY_IDS.CHECK,
			'xwa2_username_check'
		)

		if (data?.result === USERNAME_CHECK_RESULT.SUCCESS) {
			return { available: true, username, session_id }
		}

		return {
			available: false,
			username,
			session_id,
			suggestions: data?.suggestions ?? [],
			rejectionReasons: data?.rejection_reasons ?? [],
			suggestionsEligible: data?.suggestions_eligible ?? true
		}
	}

	const setUsername = async (username: string, options: SetUsernameOptions = {}) => {
		const { source = USERNAME_SOURCE.USER_INPUT, sessionId, pin } = options
		const session_id = sessionId || randomUUID()
		const variables: Record<string, unknown> = {
			username,
			reserved: true,
			source,
			session_id,
			...(pin ? { pin } : {})
		}
		return mexQuery(variables, USERNAME_QUERY_IDS.SET, 'xwa2_username_set')
	}

	const deleteUsername = async () => {
		return mexQuery({ username: null }, USERNAME_QUERY_IDS.SET, 'xwa2_username_delete')
	}

	const getMyUsername = async (): Promise<string | null> => {
		const data = await mexQuery<{ username?: string }>({}, USERNAME_QUERY_IDS.GET, 'xwa2_username_get')
		return data?.username ?? null
	}

	const setUsernamePin = async (pin: string | null) => {
		const variables = pin != null ? { pin } : {}
		return mexQuery(variables, USERNAME_QUERY_IDS.PIN_SET, 'xwa2_username_pin_set')
	}

	const findUserByUsername = async (username: string, pin?: string) => {
		const usyncQuery = new USyncQuery().withContactProtocol()
		const user = new USyncUser().withUsername(username)
		if (pin) user.withUsernameKey(pin)
		usyncQuery.withUser(user)
		const result = await executeUSyncQuery(usyncQuery)
		if (!result?.list?.length) return null
		const entry = result.list[0]!
		return {
			jid: entry.id,
			contact: (entry.contact as boolean) ?? false
		}
	}

	const fetchContactUsernames = async (...jids: string[]) => {
		const usyncQuery = new USyncQuery().withUsernameProtocol()
		for (const jid of jids) {
			usyncQuery.withUser(new USyncUser().withId(jid))
		}
		const result = await executeUSyncQuery(usyncQuery)
		return result?.list ?? []
	}

	const checkUsernameMulti = async (usernames: string[]) => {
		return mexQuery({ usernames }, USERNAME_QUERY_IDS.CHECK_MULTI, 'xwa2_username_check_multi')
	}

	const getUsernameRecommendations = async (source: UsernameSource | null = null) => {
		const variables: Record<string, unknown> = {}
		if (source) variables.source = source
		return mexQuery(variables, USERNAME_QUERY_IDS.GET_RECOMMENDATIONS, 'xwa2_username_get_recommendations')
	}

	return {
		...sock,
		checkUsername,
		checkUsernameMulti,
		setUsername,
		deleteUsername,
		getMyUsername,
		getUsernameRecommendations,
		setUsernamePin,
		findUserByUsername,
		fetchContactUsernames,
		setUsernameQueryIds,
		USERNAME_QUERY_IDS,
		USERNAME_CHECK_RESULT,
		USERNAME_SOURCE
	}
}
