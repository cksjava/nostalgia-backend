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
import { Album } from "./Album";

export type TrackSourceType = "file" | "cd" | "url";

@Table({ tableName: "tracks", timestamps: true })
export class Track extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Index
  @Column({ type: DataType.STRING(400), allowNull: false })
  declare title: string;

  // Store artist name directly
  @Index
  @Column({ type: DataType.STRING(300), allowNull: false })
  declare artist: string;

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare durationSec: number;

  // Optional album association (good for your album details screen)
  @Index
  @ForeignKey(() => Album)
  @Column({ type: DataType.UUID, allowNull: true })
  declare albumId: string | null;

  @BelongsTo(() => Album)
  declare album?: Album;

  // For correct ordering inside an album/CD
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare discNo: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare trackNo: number | null;

  /**
   * The *real* backend need: where to play from.
   * - file: sourceRef = absolute path to file (recommended) or library-relative path
   * - cd:   sourceRef = "discId:trackNo" (or whatever you choose)
   * - url:  sourceRef = "https://..."
   */
  @Column({ type: DataType.STRING(20), allowNull: false })
  declare sourceType: TrackSourceType;

  @Index
  @Column({ type: DataType.STRING(2000), allowNull: false })
  declare sourceRef: string;
}
