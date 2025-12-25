import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  ForeignKey,
  BelongsTo,
  Index,
  Unique,
} from "sequelize-typescript";
import { Track } from "./Track";

@Table({ tableName: "favourites", timestamps: true })
export class Favourite extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  // one favourite per track (single user device)
  @Unique
  @Index
  @ForeignKey(() => Track)
  @Column({ type: DataType.UUID, allowNull: false })
  declare trackId: string;

  @BelongsTo(() => Track)
  declare track?: Track;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  declare favouritedAt: Date;
}
