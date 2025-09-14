import { join } from '@std/path'
import {Contract, MaintenanceTask} from "./types.ts";
import readTextFile = Deno.readTextFile;
import mkdirSync = Deno.mkdirSync;
import { existsSync } from "https://deno.land/std@0.104.0/fs/exists.ts";
import writeFileSync = Deno.writeFileSync;

export class DataService {
  private dataDir: string;
  private contractFilePath: string;

  constructor() {
    this.dataDir = join(Deno.cwd(), 'data');
    this.contractFilePath = join(this.dataDir, 'contracts.json');
  }

  private ensureDataDirectoryExists() {
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }
  }

  public async loadContracts(): Promise<Contract[]> {
    try {
      const data = await readTextFile(this.contractFilePath);
      return JSON.parse(data) as Contract[];
    } catch (error) {
      console.error('Error reading contracts', error);
      return [];
    }
  }

  public saveContracts(contracts: Contract[]): void {
    try {
      const encoder = new TextEncoder();
      writeFileSync(
        this.contractFilePath,
        encoder.encode(JSON.stringify(contracts, null, 2)),
      )
      console.log('Contract saved successfully.');
    } catch (error) {
      console.error('Error saving contracts', error);
    }
  }
}