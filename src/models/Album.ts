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
import { Track } from "./Track";

@Table({ tableName: "albums", timestamps: true })
export class Album extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  // Stable id for URLs: "rumours", "abbey-road"
  @Unique
  @Column({ type: DataType.STRING(200), allowNull: false })
  declare slug: string;

  @Column({ type: DataType.STRING(300), allowNull: false })
  declare title: string;

  // Store artist NAMES only (no Artist table)
  // SQLite supports JSON via TEXT; Sequelize will handle it as JSON.
  @Column({ type: DataType.JSON, allowNull: false, defaultValue: [] })
  declare artists: string[];

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare year: number | null;

  @Column({ type: DataType.STRING(1000), allowNull: false })
  declare artworkUrl: string;

  @HasMany(() => Track)
  declare tracks?: Track[];
}
