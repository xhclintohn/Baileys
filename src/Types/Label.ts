export interface Label {
	id: string
	name: string
	color: number
	deleted: boolean
	predefinedId?: string
}

export interface LabelActionBody {
	id: string
	name?: string
	color?: number
	deleted?: boolean
	predefinedId?: number
}

export enum LabelColor {
	Color1 = 0,
	Color2,
	Color3,
	Color4,
	Color5,
	Color6,
	Color7,
	Color8,
	Color9,
	Color10,
	Color11,
	Color12,
	Color13,
	Color14,
	Color15,
	Color16,
	Color17,
	Color18,
	Color19,
	Color20
}
