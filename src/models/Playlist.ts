import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  Unique,
  HasMany,
} from "sequelize-typescript";
import { PlaylistItem } from "./PlaylistItem";

@Table({ tableName: "playlists", timestamps: true })
export class Playlist extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Unique
  @Column({ type: DataType.STRING(80), allowNull: false })
  declare slug: string; // "p1", etc (or generate later)

  @Column({ type: DataType.STRING(300), allowNull: false })
  declare name: string;

  @HasMany(() => PlaylistItem)
  declare items?: PlaylistItem[];
}
