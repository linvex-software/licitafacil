import { IsString, IsOptional, IsArray, IsDateString } from 'class-validator';

export class BuscarDiariosDto {
    @IsString()
    uf!: string;

    @IsOptional()
    @IsString()
    municipio?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    keywords?: string[];

    @IsOptional()
    @IsDateString()
    dataInicio?: string;

    @IsOptional()
    @IsDateString()
    dataFim?: string;
}
