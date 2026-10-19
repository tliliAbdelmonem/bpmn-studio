import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1792400369960 implements MigrationInterface {
  name = 'InitialSchema1792400369960';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "bpmn_model" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(200) NOT NULL, "description" text, "process_id" character varying(255), "current_version_number" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6b62c06455e2806767650ea0428" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "bpmn_model_version" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "model_id" uuid NOT NULL, "version_number" integer NOT NULL, "xml" text NOT NULL, "comment" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_bpmn_model_version_model_number" UNIQUE ("model_id", "version_number"), CONSTRAINT "PK_a80caa5b21217ed193aff3dbcf4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "bpmn_model_version" ADD CONSTRAINT "fk_bpmn_model_version_model" FOREIGN KEY ("model_id") REFERENCES "bpmn_model"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bpmn_model_version" DROP CONSTRAINT "fk_bpmn_model_version_model"`,
    );
    await queryRunner.query(`DROP TABLE "bpmn_model_version"`);
    await queryRunner.query(`DROP TABLE "bpmn_model"`);
  }
}
