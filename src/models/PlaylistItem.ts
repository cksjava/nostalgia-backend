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
} from "sequelize-typescript";
import { Playlist } from "./Playlist";
import { Track } from "./Track";

@Table({ tableName: "playlist_items", timestamps: true })
export class PlaylistItem extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Index
  @ForeignKey(() => Playlist)
  @Column({ type: DataType.UUID, allowNull: false })
  declare playlistId: string;

  @Index
  @ForeignKey(() => Track)
  @Column({ type: DataType.UUID, allowNull: false })
  declare trackId: string;

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare sortOrder: number;

  @BelongsTo(() => Playlist)
  declare playlist?: Playlist;

  @BelongsTo(() => Track)
  declare track?: Track;
}
